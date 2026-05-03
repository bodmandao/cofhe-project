// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

abstract contract ActuarialEngine {

    // ── Constants ──────────────────────────────────────────────────────────
    uint64 public constant BASE_PREMIUM      = 5;  // base units per period
    uint64 public constant ACTUARIAL_DIVISOR = 20; // max +5 base units at avg pool risk 100

    // ── State ──────────────────────────────────────────────────────────────
    euint64 private _poolRiskAccumulator;
    bool    private _accumulatorInit;

    // Shared with the inheriting contract — set here so _computeDynamicBase can read it.
    uint256 internal totalActivePolicies;

    // ── Internal API (called by ConfidentialInsurance) ─────────────────────

    /**
     * @dev Compute the dynamic base premium before accepting a new policy.
     *      dynamicBase = BASE_PREMIUM + avgPoolRisk / ACTUARIAL_DIVISOR
     *      Must be called BEFORE incrementing totalActivePolicies.
     */
    function _computeDynamicBase() internal returns (euint64) {
        if (!_accumulatorInit || totalActivePolicies == 0) {
            return FHE.asEuint64(BASE_PREMIUM);
        }
        uint64  count      = uint64(totalActivePolicies);
        euint64 avgRisk    = FHE.div(_poolRiskAccumulator, FHE.asEuint64(count));
        euint64 adjustment = FHE.div(avgRisk, FHE.asEuint64(ACTUARIAL_DIVISOR));
        return FHE.add(FHE.asEuint64(BASE_PREMIUM), adjustment);
    }

    /**
     * @dev Add a policy's risk score to the encrypted pool accumulator.
     *      Must be called AFTER _computeDynamicBase() and BEFORE totalActivePolicies++.
     */
    function _accumulate(euint64 riskScore) internal {
        if (!_accumulatorInit) {
            _poolRiskAccumulator = riskScore;
            _accumulatorInit     = true;
        } else {
            _poolRiskAccumulator = FHE.add(_poolRiskAccumulator, riskScore);
        }
        FHE.allowThis(_poolRiskAccumulator);
    }

    /**
     * @dev Remove a policy's risk score from the encrypted pool accumulator.
     *      Must be called BEFORE totalActivePolicies--.
     *      If this is the last active policy, resets the accumulator entirely.
     */
    function _deaccumulate(euint64 riskScore) internal {
        if (!_accumulatorInit) return;
        if (totalActivePolicies > 1) {
            _poolRiskAccumulator = FHE.sub(_poolRiskAccumulator, riskScore);
            FHE.allowThis(_poolRiskAccumulator);
        } else {
            _accumulatorInit = false;
        }
    }

    // ── Pool Risk Oracle (3-step CoFHE decrypt) ────────────────────────────

    /**
     * @notice Step 1 — grant public ACL so the CoFHE SDK can decrypt the aggregate off-chain.
     * @dev    The pool accumulator is aggregate (not individual data) — public reveal is safe.
     */
    function requestPoolRiskReveal() external {
        require(_accumulatorInit, "No policies registered");
        FHE.allowPublic(_poolRiskAccumulator);
    }

    /**
     * @notice Step 3 — publish the CoFHE threshold-signed pool risk aggregate on-chain.
     */
    function revealPoolRisk(uint64 plaintext, bytes calldata signature) external {
        require(_accumulatorInit, "No accumulator");
        FHE.publishDecryptResult(_poolRiskAccumulator, plaintext, signature);
    }

    /**
     * @notice Read the revealed pool risk aggregate (available after revealPoolRisk).
     */
    function getRevealedPoolRisk() external view returns (uint256 value, bool ready) {
        if (!_accumulatorInit) return (0, false);
        return FHE.getDecryptResultSafe(_poolRiskAccumulator);
    }

    /**
     * @notice Returns the raw FHE handle and init status of the pool risk accumulator.
     * @dev    Used by the frontend FHE Proof Explorer — handle is readable but
     *         not decryptable without ACL access.
     */
    function getPoolRiskHandle() external view returns (euint64 handle, bool initialized) {
        return (_poolRiskAccumulator, _accumulatorInit);
    }
}
