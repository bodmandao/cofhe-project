// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./InsuranceTypes.sol";
import "./ActuarialEngine.sol";

contract ConfidentialInsurance is ActuarialEngine {

    // ── Constants ──────────────────────────────────────────────────────────
    uint64  public constant RISK_DENOMINATOR = 100;          // normaliser for risk component
    uint64  public constant MIN_SEVERITY     = 30;           // minimum severity to file a claim (0–100)
    uint64  public constant TIER_MID         = 70;           // severity ≥ 70 → 100% payout
    uint256 public constant PREMIUM_UNIT     = 0.0001 ether; // 1 unit = 0.0001 ETH

    // ── State ──────────────────────────────────────────────────────────────
    uint256 private _nextPolicyId = 1;
    uint256 private _nextClaimId  = 1;

    mapping(uint256 => Policy)    public  policies;
    mapping(uint256 => Claim)     public  claims;
    mapping(address => uint256[]) private _userPolicies;
    mapping(address => uint256[]) private _userClaims;

    // Public aggregate statistics — no individual data exposed
    uint256 public poolBalance;
    uint256 public totalPolicies;
    // totalActivePolicies — inherited from ActuarialEngine (internal, used by dynamic base)
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

    // ── Policy Lifecycle ──────────────────────────────────────────────────

    /**
     * @notice Register a new policy with fully encrypted risk inputs.
     * @dev    Premium is computed entirely on ciphertexts:
     *           dynamicBase = BASE_PREMIUM + avgPoolRisk / ACTUARIAL_DIVISOR
     *           premium     = dynamicBase + (riskScore × coverage) / RISK_DENOMINATOR
     *         The protocol never sees plaintext age, risk score, or coverage.
     * @param encAge       Encrypted age in years
     * @param encRiskScore Encrypted risk score 1–100
     * @param encCoverage  Encrypted coverage in units (1 unit = PREMIUM_UNIT ETH)
     * @return policyId    Assigned policy identifier
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

        // Dynamic base from ActuarialEngine — read pool state BEFORE updating it
        euint64 dynamicBase   = _computeDynamicBase();

        euint64 product       = FHE.mul(riskScore, coverage);
        euint64 riskComponent = FHE.div(product, FHE.asEuint64(RISK_DENOMINATOR));
        euint64 premium       = FHE.add(dynamicBase, riskComponent);

        // Update pool accumulator AFTER computing the base for this policy
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

        emit PolicyRegistered(policyId, msg.sender, block.timestamp);
    }

    /**
     * @notice Pay the premium to activate/renew coverage for 30 days.
     * @dev    The holder decrypts their premium via revealPremium() to know the
     *         ETH amount. On-chain we accept any amount ≥ PREMIUM_UNIT.
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
        // Deaccumulate BEFORE decrementing totalActivePolicies
        _deaccumulate(policies[policyId].encryptedRiskScore);
        totalActivePolicies--;

        policies[policyId].status = PolicyStatus.Cancelled;
        emit PolicyCancelled(policyId);
    }

    // ── Premium Reveal (3-step CoFHE flow) ────────────────────────────────

    /**
     * @notice Step 1 — grant public decrypt ACL so the CoFHE SDK can decrypt off-chain.
     */
    function requestPremiumReveal(uint256 policyId) external onlyHolder(policyId) {
        FHE.allowPublic(policies[policyId].encryptedPremium);
    }

    /**
     * @notice Step 3 — publish the CoFHE threshold-signed premium plaintext on-chain.
     * @dev    Full flow:
     *           (1) requestPremiumReveal(policyId)      — grants public ACL
     *           (2) sdk.decryptForTx(handle).execute()  — off-chain threshold decrypt
     *           (3) revealPremium(policyId, value, sig) — stores result on-chain
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
     * @return units  Multiply by PREMIUM_UNIT to get the ETH amount.
     * @return ready  True once the CoFHE oracle has published the result.
     */
    function getRevealedPremium(uint256 policyId)
        external view
        validPolicy(policyId)
        returns (uint256 units, bool ready)
    {
        return FHE.getDecryptResultSafe(policies[policyId].encryptedPremium);
    }

    // ── Claims Lifecycle ──────────────────────────────────────────────────

    /**
     * @notice File a claim with encrypted amount and severity.
     * @dev    FHE validation pipeline (all on ciphertexts):
     *           amountValid   = FHE.lte(claimAmount, encryptedCoverage)
     *           severityValid = FHE.gte(severity, MIN_SEVERITY)
     *           isValid       = FHE.and(amountValid, severityValid)  → euint8
     *         Payout tier:
     *           severity ≥ TIER_MID → 100% of claim  |  else → 50%
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

        // Validation
        ebool amountValid   = FHE.lte(claimAmount, policies[policyId].encryptedCoverage);
        ebool severityValid = FHE.gte(severity, FHE.asEuint64(MIN_SEVERITY));
        ebool isValidBool   = FHE.and(amountValid, severityValid);
        euint8 isValid = FHE.select(isValidBool, FHE.asEuint8(uint8(1)), FHE.asEuint8(uint8(0)));

        // Tiered payout
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
     * @notice Submit the CoFHE threshold-decrypted validity result for a claim.
     * @param claimId   Claim to finalise
     * @param plaintext 1 = valid / 0 = invalid (from CoFHE oracle)
     * @param signature Threshold network signature
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
     * @param claimId   Approved claim
     * @param plaintext Payout amount in units (from CoFHE oracle)
     * @param signature Threshold network signature
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
     * @dev    Payout amount is only revealed at this moment via getDecryptResultSafe.
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

    // ── Pool Admin ────────────────────────────────────────────────────────

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
     * @notice Returns raw encrypted handles for a policy.
     * @dev    Handles can only be decrypted by addresses that hold ACL permission.
     */
    function getPolicyHandles(uint256 policyId)
        external view
        validPolicy(policyId)
        returns (euint64 age, euint64 riskScore, euint64 coverage, euint64 premium)
    {
        Policy storage p = policies[policyId];
        return (p.encryptedAge, p.encryptedRiskScore, p.encryptedCoverage, p.encryptedPremium);
    }

    /**
     * @notice Returns raw encrypted handles for a claim.
     */
    function getClaimHandles(uint256 claimId)
        external view
        returns (euint64 amount, euint64 severity, euint64 payout, euint8 valid)
    {
        if (claims[claimId].claimant == address(0)) revert ClaimNotFound(claimId);
        Claim storage c = claims[claimId];
        return (c.encryptedClaimAmount, c.encryptedSeverity, c.encryptedPayout, c.isValid);
    }
}
