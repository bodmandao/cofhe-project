// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract ConfidentialInsurance {

    // ── Constants ──────────────────────────────────────────────────────────
    uint64  public constant BASE_PREMIUM     = 5;            // base units per period
    uint64  public constant RISK_DENOMINATOR = 100;          // normaliser
    uint64  public constant MIN_SEVERITY     = 30;           // minimum to file a claim (0–100)
    uint64  public constant TIER_MID         = 70;           // severity ≥ 70 → full payout
    uint256 public constant PREMIUM_UNIT     = 0.0001 ether; // 1 unit = 0.0001 ETH

    // ── Enums ──────────────────────────────────────────────────────────────
    enum PolicyStatus { Active, Expired, Cancelled }
    enum ClaimStatus  { Pending, Approved, Rejected, Paid }

    // ── Structs ────────────────────────────────────────────────────────────
    struct Policy {
        address      holder;
        euint64      encryptedAge;        // encrypted — only holder can read
        euint64      encryptedRiskScore;  // encrypted — only holder can read
        euint64      encryptedCoverage;   // encrypted — only holder can read
        euint64      encryptedPremium;    // FHE-computed — only holder can decrypt
        uint256      premiumPaidUntil;
        PolicyStatus status;
        uint256      createdAt;
    }

    struct Claim {
        uint256     policyId;
        address     claimant;
        euint64     encryptedClaimAmount; // encrypted — only claimant can read
        euint64     encryptedSeverity;    // encrypted — only claimant can read
        euint64     encryptedPayout;      // FHE.select result — tiered by severity
        euint8      isValid;             // 1 = valid, 0 = invalid (euint8: publishDecryptResult supported)
        ClaimStatus status;
        uint256     filedAt;
    }

    // ── State ──────────────────────────────────────────────────────────────
    uint256 private _nextPolicyId = 1;
    uint256 private _nextClaimId  = 1;

    mapping(uint256 => Policy)  public policies;
    mapping(uint256 => Claim)   public claims;
    mapping(address => uint256[]) private _userPolicies;
    mapping(address => uint256[]) private _userClaims;

    // Public aggregate statistics only — no individual data exposed
    uint256 public poolBalance;
    uint256 public totalPolicies;
    uint256 public totalActivePolicies;
    uint256 public totalClaims;
    uint256 public totalApprovedClaims;
    uint256 public totalPayouts;

    // ── Events ────────────────────────────────────────────────────────────
    event PolicyRegistered(uint256 indexed policyId, address indexed holder, uint256 timestamp);
    event PremiumPaid(uint256 indexed policyId, uint256 periodEnd, uint256 amount);
    event ClaimFiled(uint256 indexed claimId, uint256 indexed policyId, address indexed claimant);
    event ClaimValidated(uint256 indexed claimId, bool approved);
    event ClaimPaid(uint256 indexed claimId, address indexed claimant, uint256 amount);
    event PoolFunded(address indexed funder, uint256 amount);
    event PolicyCancelled(uint256 indexed policyId);

    // ── Errors ────────────────────────────────────────────────────────────
    error PolicyNotFound(uint256 id);
    error ClaimNotFound(uint256 id);
    error NotPolicyHolder(uint256 id);
    error NotClaimant(uint256 id);
    error PolicyNotActive(uint256 id);
    error PremiumOverdue(uint256 id);
    error ClaimAlreadyProcessed(uint256 id);
    error ClaimNotApproved(uint256 id);
    error PayoutNotDecrypted(uint256 id);
    error InsufficientPool();

    // ── Modifiers ─────────────────────────────────────────────────────────
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

    // ── Core: Policy Lifecycle ────────────────────────────────────────────

    /**
     * @notice Register a new insurance policy with fully encrypted risk inputs.
     * @dev    Premium is computed entirely on ciphertexts:
     *           premium = BASE_PREMIUM + (riskScore × coverage) ÷ RISK_DENOMINATOR
     *         The protocol never sees plaintext age, risk score, or coverage.
     * @param  encAge       Encrypted age in years (e.g. 35)
     * @param  encRiskScore Encrypted risk score 1–100 (higher = more risky)
     * @param  encCoverage  Encrypted coverage in units (1 unit = PREMIUM_UNIT ETH)
     * @return policyId     Assigned policy identifier
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

        // ── FHE Premium Computation ───────────────────────────────────────
        // Step 1: risk component = (riskScore × coverage) ÷ RISK_DENOMINATOR
        euint64 denom         = FHE.asEuint64(RISK_DENOMINATOR);
        euint64 product       = FHE.mul(riskScore, coverage);
        euint64 riskComponent = FHE.div(product, denom);
        // Step 2: total premium = BASE_PREMIUM + riskComponent
        euint64 premium       = FHE.add(FHE.asEuint64(BASE_PREMIUM), riskComponent);

        // ── ACL: contract + holder only ───────────────────────────────────
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

        emit PolicyRegistered(policyId, msg.sender, block.timestamp);
    }

    /**
     * @notice Pay the premium to activate/renew coverage for 30 days.
     * @dev    Off-chain the holder first decrypts their premium via revealPremium()
     *         to know the ETH amount required. On-chain we accept any amount ≥ PREMIUM_UNIT.
     */
    function payPremium(uint256 policyId)
        external payable
        onlyHolder(policyId)
        activePolicy(policyId)
    {
        require(msg.value >= PREMIUM_UNIT, "Minimum premium is 0.0001 ETH");
        poolBalance += msg.value;

        Policy storage p = policies[policyId];
        uint256 base = p.premiumPaidUntil < block.timestamp
            ? block.timestamp
            : p.premiumPaidUntil;
        p.premiumPaidUntil = base + 30 days;

        emit PremiumPaid(policyId, p.premiumPaidUntil, msg.value);
    }

    // ── Core: Claims Lifecycle ─────────────────────────────────────────────

    /**
     * @notice File an insurance claim with encrypted amount and severity.
     * @dev    FHE validates the claim in three encrypted steps:
     *           1. amountValid   = FHE.lte(claimAmount, encryptedCoverage)
     *           2. severityValid = FHE.gte(severity, MIN_SEVERITY)
     *           3. isValid       = FHE.and(amountValid, severityValid)
     *         Payout tier is selected via FHE.select:
     *           severity ≥ TIER_MID → 100% of claim  |  otherwise → 50%
     * @param  policyId        The policy to claim against
     * @param  encClaimAmount  Encrypted claim amount in units
     * @param  encSeverity     Encrypted incident severity 0–100
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

        // ── FHE Claim Validation ───────────────────────────────────────────
        ebool amountValid   = FHE.lte(claimAmount, policies[policyId].encryptedCoverage);
        ebool severityValid = FHE.gte(severity, FHE.asEuint64(MIN_SEVERITY));
        ebool isValidBool   = FHE.and(amountValid, severityValid);
        // Convert ebool → euint8 so publishDecryptResult is supported (no ebool overload)
        euint8 isValid = FHE.select(isValidBool, FHE.asEuint8(uint8(1)), FHE.asEuint8(uint8(0)));

        // ── FHE Tiered Payout Selection ────────────────────────────────────
        euint64 halfPayout = FHE.div(claimAmount, FHE.asEuint64(uint64(2)));
        ebool   isHighTier = FHE.gte(severity, FHE.asEuint64(TIER_MID));
        euint64 payout     = FHE.select(isHighTier, claimAmount, halfPayout);

        // ── ACL: contract + claimant only ─────────────────────────────────
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
     * @notice Submit the CoFHE threshold-decrypted validity result for a claim.
     * @dev    3-step flow: (1) frontend calls decryptForTx on isValid ebool off-chain
     *                      (2) CoFHE threshold network signs the plaintext
     *                      (3) this function finalises on-chain
     * @param  claimId   Claim to finalise
     * @param  plaintext 1 = valid / 0 = invalid  (from CoFHE oracle)
     * @param  signature Threshold network signature
     */
    function publishClaimValidity(
        uint256 claimId,
        uint8   plaintext,
        bytes calldata signature
    ) external {
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
     * @notice Submit the CoFHE threshold-decrypted payout amount for an approved claim.
     * @param  claimId   Approved claim
     * @param  plaintext Payout amount in units (from CoFHE oracle)
     * @param  signature Threshold network signature
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
     * @dev    Reads the decrypted payout units via getDecryptResultSafe, converts to
     *         ETH, and transfers. The payout amount is only revealed at this moment.
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

    // ── Premium Reveal (3-step CoFHE flow) ────────────────────────────────

    /**
     * @notice Step 1 — grant public decrypt ACL so the CoFHE SDK can decrypt off-chain.
     * @dev    Call this first. Then call the SDK's decryptForTx off-chain to get the
     *         (plaintext, signature) pair. Then call revealPremium with those values.
     */
    function requestPremiumReveal(uint256 policyId) external onlyHolder(policyId) {
        FHE.allowPublic(policies[policyId].encryptedPremium);
    }

    /**
     * @notice Step 3 — publish the CoFHE threshold-signed plaintext on-chain.
     * @dev    Call flow:
     *           (1) requestPremiumReveal(policyId)      — grants public ACL
     *           (2) sdk.decryptForTx(handle).execute()  — off-chain threshold decrypt
     *           (3) revealPremium(policyId, value, sig) — publishes result on-chain
     *         After this the holder reads their premium via getRevealedPremium().
     */
    function revealPremium(
        uint256 policyId,
        uint64  plaintext,
        bytes calldata signature
    ) external onlyHolder(policyId) {
        FHE.publishDecryptResult(policies[policyId].encryptedPremium, plaintext, signature);
    }

    /**
     * @notice Read the decrypted premium (available only after revealPremium).
     * @return units  Premium in abstract units; multiply by PREMIUM_UNIT for ETH amount.
     * @return ready  True once the CoFHE oracle has delivered the result.
     */
    function getRevealedPremium(uint256 policyId)
        external view validPolicy(policyId)
        returns (uint256 units, bool ready)
    {
        return FHE.getDecryptResultSafe(policies[policyId].encryptedPremium);
    }

    // ── Admin / Pool ──────────────────────────────────────────────────────

    function cancelPolicy(uint256 policyId)
        external onlyHolder(policyId) activePolicy(policyId)
    {
        policies[policyId].status = PolicyStatus.Cancelled;
        totalActivePolicies--;
        emit PolicyCancelled(policyId);
    }

    function fundPool() external payable {
        require(msg.value > 0, "Zero ETH");
        poolBalance += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }

    receive() external payable {
        poolBalance += msg.value;
    }

    // ── View Helpers ──────────────────────────────────────────────────────

    function getPoolStats() external view returns (
        uint256 balance,
        uint256 policies_,
        uint256 active,
        uint256 claims_,
        uint256 approved,
        uint256 payouts
    ) {
        return (
            poolBalance,
            totalPolicies,
            totalActivePolicies,
            totalClaims,
            totalApprovedClaims,
            totalPayouts
        );
    }

    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return _userPolicies[user];
    }

    function getUserClaims(address user) external view returns (uint256[] memory) {
        return _userClaims[user];
    }

    /**
     * @notice Returns the raw encrypted handles for a policy.
     * @dev    Handles can only be decrypted by addresses that hold ACL permission.
     */
    function getPolicyHandles(uint256 policyId) external view validPolicy(policyId)
        returns (euint64 age, euint64 riskScore, euint64 coverage, euint64 premium)
    {
        Policy storage p = policies[policyId];
        return (p.encryptedAge, p.encryptedRiskScore, p.encryptedCoverage, p.encryptedPremium);
    }

    /**
     * @notice Returns the raw encrypted handles for a claim.
     */
    function getClaimHandles(uint256 claimId) external view
        returns (euint64 amount, euint64 severity, euint64 payout, euint8 valid)
    {
        if (claims[claimId].claimant == address(0)) revert ClaimNotFound(claimId);
        Claim storage c = claims[claimId];
        return (c.encryptedClaimAmount, c.encryptedSeverity, c.encryptedPayout, c.isValid);
    }
}
