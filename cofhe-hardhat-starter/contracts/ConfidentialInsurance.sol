// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./InsuranceTypes.sol";
import "./ActuarialEngine.sol";
import "./CommitteeManager.sol";

contract ConfidentialInsurance is ActuarialEngine, CommitteeManager, ERC721 {
    using Strings for uint256;

    //  Constants 
    uint64  public constant RISK_DENOMINATOR = 100;
    uint64  public constant MIN_SEVERITY     = 30;
    uint64  public constant TIER_MID         = 70;
    uint256 public constant PREMIUM_UNIT     = 0.0001 ether;

    //  State 
    uint256 private _nextPolicyId = 1;
    uint256 private _nextClaimId  = 1;

    mapping(uint256 => Policy)    public  policies;
    mapping(uint256 => Claim)     public  claims;
    mapping(address => uint256[]) private _userPolicies;
    mapping(address => uint256[]) private _userClaims;

    uint256 public poolBalance;
    uint256 public totalPolicies;
    // totalActivePolicies — inherited from ActuarialEngine
    uint256 public totalClaims;
    uint256 public totalApprovedClaims;
    uint256 public totalPayouts;

    //  Events 
    event PolicyRegistered(uint256 indexed policyId, address indexed holder, uint256 timestamp);
    event PremiumPaid(uint256 indexed policyId, uint256 periodEnd, uint256 amount);
    event ClaimFiled(uint256 indexed claimId, uint256 indexed policyId, address indexed claimant);
    event ClaimValidated(uint256 indexed claimId, bool approved);
    event ClaimPaid(uint256 indexed claimId, address indexed claimant, uint256 amount);
    event PoolFunded(address indexed funder, uint256 amount);
    event PolicyCancelled(uint256 indexed policyId);

    //  Constructor 

    /**
     * @param committee  Initial committee member addresses
     * @param quorum     Number of committee votes required to unlock claim reveal
     */
    constructor(
        address[] memory committee,
        uint256          quorum
    ) ERC721("ShieldFi Policy", "SFDP") {
        _initCommittee(committee, quorum, msg.sender);
    }

    //  Modifiers ─
    modifier validPolicy(uint256 id) {
        if (policies[id].holder == address(0)) revert PolicyNotFound(id);
        _;
    }

    modifier onlyHolder(uint256 id) {
        if (policies[id].holder == address(0)) revert PolicyNotFound(id);
        if (policies[id].holder != msg.sender)  revert NotPolicyHolder(id);
        _;
    }

    modifier activePolicy(uint256 id) {
        if (policies[id].status != PolicyStatus.Active) revert PolicyNotActive(id);
        _;
    }

    //  Policy Lifecycle 

    /**
     * @notice Register a new policy with fully encrypted risk inputs.
     *         Mints an ERC-721 NFT (tokenId = policyId) to the holder.
     * @dev    Premium = dynamicBase + (riskScore × coverage) / RISK_DENOMINATOR
     *         dynamicBase grows with pool avg risk — all on ciphertexts.
     * @param encAge       Encrypted age in years
     * @param encRiskScore Encrypted risk score 1–100
     * @param encCoverage  Encrypted coverage in units
     * @return policyId    Assigned policy identifier (also the NFT tokenId)
     */
    function registerPolicy(
        InEuint64 calldata encAge,
        InEuint64 calldata encRiskScore,
        InEuint64 calldata encCoverage
    ) external returns (uint256 policyId) {
        policyId = _nextPolicyId++;

        euint64 age       = FHE.asEuint64(encAge);
        euint64 riskScore = FHE.asEuint64(encRiskScore);
        euint64 coverage  = FHE.asEuint64(encCoverage);

        euint64 dynamicBase   = _computeDynamicBase();
        euint64 product       = FHE.mul(riskScore, coverage);
        euint64 riskComponent = FHE.div(product, FHE.asEuint64(RISK_DENOMINATOR));
        euint64 premium       = FHE.add(dynamicBase, riskComponent);

        _accumulate(riskScore);

        FHE.allowThis(age);        FHE.allowSender(age);
        FHE.allowThis(riskScore);  FHE.allowSender(riskScore);
        FHE.allowThis(coverage);   FHE.allowSender(coverage);
        FHE.allowThis(premium);    FHE.allowSender(premium);

        policies[policyId] = Policy({
            holder:             msg.sender,
            encryptedAge:       age,
            encryptedRiskScore: riskScore,
            encryptedCoverage:  coverage,
            encryptedPremium:   premium,
            premiumPaidUntil:   0,
            status:             PolicyStatus.Active,
            createdAt:          block.timestamp
        });

        _userPolicies[msg.sender].push(policyId);
        totalPolicies++;
        totalActivePolicies++;

        // Mint NFT — tokenId = policyId
        _safeMint(msg.sender, policyId);

        emit PolicyRegistered(policyId, msg.sender, block.timestamp);
    }

    /**
     * @notice Pay the premium to activate/renew coverage for 30 days.
     */
    function payPremium(uint256 policyId)
        external payable
        onlyHolder(policyId)
        activePolicy(policyId)
    {
        require(msg.value >= PREMIUM_UNIT, "Minimum premium is 0.0001 ETH");
        poolBalance += msg.value;

        Policy storage p = policies[policyId];
        uint256 from = p.premiumPaidUntil < block.timestamp
            ? block.timestamp
            : p.premiumPaidUntil;
        p.premiumPaidUntil = from + 30 days;

        emit PremiumPaid(policyId, p.premiumPaidUntil, msg.value);
    }

    /**
     * @notice Cancel an active policy and remove its risk from the pool accumulator.
     */
    function cancelPolicy(uint256 policyId)
        external
        onlyHolder(policyId)
        activePolicy(policyId)
    {
        _deaccumulate(policies[policyId].encryptedRiskScore);
        totalActivePolicies--;
        policies[policyId].status = PolicyStatus.Cancelled;
        emit PolicyCancelled(policyId);
    }

    //  Premium Reveal (3-step CoFHE flow) 

    /** @notice Step 1 — grant public ACL so CoFHE SDK can decrypt premium off-chain. */
    function requestPremiumReveal(uint256 policyId) external onlyHolder(policyId) {
        FHE.allowPublic(policies[policyId].encryptedPremium);
    }

    /**
     * @notice Step 3 — publish CoFHE threshold-signed premium plaintext on-chain.
     * @dev    Flow: requestPremiumReveal → sdk.decryptForTx → revealPremium
     */
    function revealPremium(
        uint256 policyId,
        uint64  plaintext,
        bytes calldata signature
    ) external onlyHolder(policyId) {
        FHE.publishDecryptResult(policies[policyId].encryptedPremium, plaintext, signature);
    }

    /** @notice Read the decrypted premium after revealPremium completes. */
    function getRevealedPremium(uint256 policyId)
        external view
        validPolicy(policyId)
        returns (uint256 units, bool ready)
    {
        return FHE.getDecryptResultSafe(policies[policyId].encryptedPremium);
    }

    //  Claims Lifecycle 

    /**
     * @notice File a claim with encrypted amount and severity.
     * @dev    FHE validation (all on ciphertexts):
     *           amountValid   = FHE.lte(claimAmount, encryptedCoverage)
     *           severityValid = FHE.gte(severity, MIN_SEVERITY)
     *           isValid       = FHE.and(amountValid, severityValid)  → euint8
     *         Payout: severity ≥ TIER_MID → 100%  |  else → 50%
     * @param policyId       Policy to claim against
     * @param encClaimAmount Encrypted claim amount in units
     * @param encSeverity    Encrypted incident severity 0–100
     * @return claimId
     */
    function fileClaim(
        uint256   policyId,
        InEuint64 calldata encClaimAmount,
        InEuint64 calldata encSeverity
    ) external onlyHolder(policyId) activePolicy(policyId) returns (uint256 claimId) {
        if (policies[policyId].premiumPaidUntil < block.timestamp)
            revert PremiumOverdue(policyId);

        claimId = _nextClaimId++;

        euint64 claimAmount = FHE.asEuint64(encClaimAmount);
        euint64 severity    = FHE.asEuint64(encSeverity);

        ebool amountValid   = FHE.lte(claimAmount, policies[policyId].encryptedCoverage);
        ebool severityValid = FHE.gte(severity, FHE.asEuint64(MIN_SEVERITY));
        ebool isValidBool   = FHE.and(amountValid, severityValid);
        euint8 isValid = FHE.select(isValidBool, FHE.asEuint8(uint8(1)), FHE.asEuint8(uint8(0)));

        euint64 halfPayout = FHE.div(claimAmount, FHE.asEuint64(uint64(2)));
        ebool   isHighTier = FHE.gte(severity, FHE.asEuint64(TIER_MID));
        euint64 payout     = FHE.select(isHighTier, claimAmount, halfPayout);

        FHE.allowThis(claimAmount); FHE.allowSender(claimAmount);
        FHE.allowThis(severity);    FHE.allowSender(severity);
        FHE.allowThis(isValid);     FHE.allowSender(isValid);
        FHE.allowThis(payout);      FHE.allowSender(payout);

        claims[claimId] = Claim({
            policyId:             policyId,
            claimant:             msg.sender,
            encryptedClaimAmount: claimAmount,
            encryptedSeverity:    severity,
            encryptedPayout:      payout,
            isValid:              isValid,
            status:               ClaimStatus.Pending,
            filedAt:              block.timestamp
        });

        _userClaims[msg.sender].push(claimId);
        totalClaims++;

        emit ClaimFiled(claimId, policyId, msg.sender);
    }

    /**
     * @notice Submit the CoFHE threshold-decrypted validity result.
     * @dev    Requires committee quorum first — call voteOnClaim() until quorum is met,
     *         then call this with the CoFHE oracle result.
     * @param claimId   Claim to finalise
     * @param plaintext 1 = valid / 0 = invalid
     * @param signature CoFHE threshold network signature
     */
    function publishClaimValidity(
        uint256 claimId,
        uint8   plaintext,
        bytes calldata signature
    ) external requiresQuorum(claimId) {
        Claim storage c = claims[claimId];
        if (c.claimant == address(0)) revert ClaimNotFound(claimId);
        if (c.status != ClaimStatus.Pending) revert ClaimAlreadyProcessed(claimId);

        FHE.publishDecryptResult(c.isValid, plaintext, signature);

        bool approved = plaintext == 1;
        c.status = approved ? ClaimStatus.Approved : ClaimStatus.Rejected;
        if (approved) totalApprovedClaims++;

        emit ClaimValidated(claimId, approved);
    }

    /**
     * @notice Submit the CoFHE threshold-decrypted payout amount.
     * @param claimId   Approved claim
     * @param plaintext Payout in units
     * @param signature CoFHE threshold network signature
     */
    function publishPayoutAmount(
        uint256 claimId,
        uint64  plaintext,
        bytes calldata signature
    ) external {
        Claim storage c = claims[claimId];
        if (c.status != ClaimStatus.Approved) revert ClaimNotApproved(claimId);
        FHE.publishDecryptResult(c.encryptedPayout, plaintext, signature);
    }

    /**
     * @notice Withdraw an approved claim payout.
     * @dev    Payout ETH amount revealed only here via getDecryptResultSafe.
     */
    function withdrawPayout(uint256 claimId) external {
        Claim storage c = claims[claimId];
        if (c.claimant != msg.sender)         revert NotClaimant(claimId);
        if (c.status != ClaimStatus.Approved) revert ClaimNotApproved(claimId);

        (uint256 payoutUnits, bool decrypted) = FHE.getDecryptResultSafe(c.encryptedPayout);
        if (!decrypted) revert PayoutNotDecrypted(claimId);

        uint256 payoutWei = payoutUnits * PREMIUM_UNIT;
        if (poolBalance < payoutWei) revert InsufficientPool();

        c.status      = ClaimStatus.Paid;
        poolBalance  -= payoutWei;
        totalPayouts += payoutWei;

        (bool ok,) = msg.sender.call{value: payoutWei}("");
        require(ok, "ETH transfer failed");

        emit ClaimPaid(claimId, msg.sender, payoutWei);
    }

    //  Pool Admin 

    function fundPool() external payable {
        require(msg.value > 0, "Zero ETH");
        poolBalance += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }

    receive() external payable {
        poolBalance += msg.value;
    }

    //  ERC-721 Overrides ─

    /**
     * @dev When a Policy NFT is transferred the policy holder is updated to the
     *      new owner, transferring all insurance rights along with the token.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        if (policies[tokenId].holder != address(0) && to != address(0)) {
            policies[tokenId].holder = to;
        }
        return from;
    }

    /**
     * @notice On-chain SVG NFT metadata. Shows policy ID, status, and the
     *         encrypted handle — making the invisible FHE state visible.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        bytes memory svg  = bytes(_buildSVG(tokenId));
        bytes memory json = abi.encodePacked(
            '{"name":"ShieldFi Policy #', tokenId.toString(),
            '","description":"Confidential Insurance Policy - risk data encrypted via Fhenix CoFHE. No plaintext ever touches the chain.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(svg),
            '","attributes":[',
            '{"trait_type":"Status","value":"',    _statusLabel(tokenId), '"},',
            '{"trait_type":"Created","value":',    policies[tokenId].createdAt.toString(), '},',
            '{"trait_type":"Protocol","value":"ShieldFi"},',
            '{"trait_type":"Chain","value":"Fhenix CoFHE"}',
            ']}'
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function _buildSVG(uint256 tokenId) internal view returns (string memory) {
        Policy storage p   = policies[tokenId];
        string memory sCol = p.status == PolicyStatus.Active
            ? "#00ff88"
            : p.status == PolicyStatus.Cancelled ? "#ef4444" : "#f59e0b";

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#04050d"/>',
            '<rect x="1" y="1" width="398" height="398" fill="none" stroke="#00ff8820" stroke-width="1"/>',
            // header
            '<text x="24" y="50" font-family="monospace" font-size="11" fill="#00ff88" letter-spacing="3">SHIELDFI PROTOCOL</text>',
            '<text x="24" y="68" font-family="monospace" font-size="8" fill="#ffffff25" letter-spacing="2">// CONFIDENTIAL INSURANCE NFT</text>',
            '<line x1="24" y1="82" x2="376" y2="82" stroke="#00ff8812" stroke-width="1"/>',
            // policy ID
            '<text x="24" y="140" font-family="monospace" font-size="56" font-weight="bold" fill="#ffffff" letter-spacing="-3">#',
            tokenId.toString(),
            '</text>',
            // status pill
            '<rect x="24" y="152" width="76" height="18" fill="', sCol, '12" rx="2"/>',
            '<text x="32" y="165" font-family="monospace" font-size="8" fill="', sCol, '" letter-spacing="2">',
            _statusLabel(tokenId), '</text>',
            // encrypted handle section
            '<text x="24" y="208" font-family="monospace" font-size="8" fill="#ffffff30" letter-spacing="2">ENCRYPTED HANDLE</text>',
            '<rect x="24" y="216" width="352" height="30" fill="#ffffff04" rx="2"/>',
            '<text x="32" y="235" font-family="monospace" font-size="8" fill="#00ff8850">0x????????????????????????????????...</text>',
            // formula
            '<text x="24" y="278" font-family="monospace" font-size="8" fill="#ffffff30" letter-spacing="2">PREMIUM FORMULA</text>',
            '<text x="24" y="294" font-family="monospace" font-size="8" fill="#7c3aed90">FHE.add(dynamicBase, FHE.div(FHE.mul(risk,cov),100))</text>',
            // footer
            '<line x1="24" y1="346" x2="376" y2="346" stroke="#00ff8812" stroke-width="1"/>',
            '<text x="24" y="368" font-family="monospace" font-size="7" fill="#ffffff25">FHENIX CoFHE  //  FULLY HOMOMORPHIC ENCRYPTION</text>',
            '<circle cx="372" cy="364" r="5" fill="#00ff88"/>',
            '</svg>'
        ));
    }

    function _statusLabel(uint256 tokenId) internal view returns (string memory) {
        PolicyStatus s = policies[tokenId].status;
        if (s == PolicyStatus.Active)    return "ACTIVE";
        if (s == PolicyStatus.Cancelled) return "CANCELLED";
        return "EXPIRED";
    }

    //  View Helpers 

    function getPoolStats() external view returns (
        uint256 balance, uint256 policies_, uint256 active,
        uint256 claims_,  uint256 approved,  uint256 payouts
    ) {
        return (poolBalance, totalPolicies, totalActivePolicies,
                totalClaims, totalApprovedClaims, totalPayouts);
    }

    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return _userPolicies[user];
    }

    function getUserClaims(address user) external view returns (uint256[] memory) {
        return _userClaims[user];
    }

    function getPolicyHandles(uint256 policyId)
        external view validPolicy(policyId)
        returns (euint64 age, euint64 riskScore, euint64 coverage, euint64 premium)
    {
        Policy storage p = policies[policyId];
        return (p.encryptedAge, p.encryptedRiskScore, p.encryptedCoverage, p.encryptedPremium);
    }

    function getClaimHandles(uint256 claimId)
        external view
        returns (euint64 amount, euint64 severity, euint64 payout, euint8 valid)
    {
        if (claims[claimId].claimant == address(0)) revert ClaimNotFound(claimId);
        Claim storage c = claims[claimId];
        return (c.encryptedClaimAmount, c.encryptedSeverity, c.encryptedPayout, c.isValid);
    }
}
