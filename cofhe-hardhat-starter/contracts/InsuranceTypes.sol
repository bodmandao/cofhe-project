// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

// ── Enums ──────────────────────────────────────────────────────────────────
enum PolicyStatus { Active, Expired, Cancelled }
enum ClaimStatus  { Pending, Approved, Rejected, Paid }

// ── Structs ────────────────────────────────────────────────────────────────
struct Policy {
    address      holder;
    euint64      encryptedAge;       // encrypted — only holder can read
    euint64      encryptedRiskScore; // encrypted — only holder can read
    euint64      encryptedCoverage;  // encrypted — only holder can read
    euint64      encryptedPremium;   // FHE-computed — only holder can decrypt
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
    euint8      isValid;              // euint8: publishDecryptResult supported (no ebool overload)
    ClaimStatus status;
    uint256     filedAt;
}

// ── Custom Errors ──────────────────────────────────────────────────────────
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
