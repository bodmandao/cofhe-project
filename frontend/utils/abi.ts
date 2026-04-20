export const INSURANCE_ABI = [
  // ── Policy Registration ─────────────────────────────────────────────────
  {
    name: "registerPolicy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encAge",       type: "tuple", components: [{ name: "ctHash", type: "bytes32" }, { name: "securityZone", type: "int32" }] },
      { name: "encRiskScore", type: "tuple", components: [{ name: "ctHash", type: "bytes32" }, { name: "securityZone", type: "int32" }] },
      { name: "encCoverage",  type: "tuple", components: [{ name: "ctHash", type: "bytes32" }, { name: "securityZone", type: "int32" }] },
    ],
    outputs: [{ name: "policyId", type: "uint256" }],
  },

  // ── Premium Payment ─────────────────────────────────────────────────────
  {
    name: "payPremium",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [],
  },

  // ── Premium Reveal ──────────────────────────────────────────────────────
  {
    name: "revealPremium",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "policyId",  type: "uint256" },
      { name: "plaintext", type: "uint64" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "getRevealedPremium",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      { name: "units", type: "uint256" },
      { name: "ready", type: "bool" },
    ],
  },

  // ── Claims ──────────────────────────────────────────────────────────────
  {
    name: "fileClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "policyId",        type: "uint256" },
      { name: "encClaimAmount",  type: "tuple", components: [{ name: "ctHash", type: "bytes32" }, { name: "securityZone", type: "int32" }] },
      { name: "encSeverity",     type: "tuple", components: [{ name: "ctHash", type: "bytes32" }, { name: "securityZone", type: "int32" }] },
    ],
    outputs: [{ name: "claimId", type: "uint256" }],
  },
  {
    name: "publishClaimValidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimId",   type: "uint256" },
      { name: "plaintext", type: "uint32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "publishPayoutAmount",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimId",   type: "uint256" },
      { name: "plaintext", type: "uint64" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "withdrawPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "claimId", type: "uint256" }],
    outputs: [],
  },

  // ── Pool ────────────────────────────────────────────────────────────────
  {
    name: "fundPool",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "cancelPolicy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [],
  },

  // ── Views ───────────────────────────────────────────────────────────────
  {
    name: "getPoolStats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "balance",  type: "uint256" },
      { name: "policies", type: "uint256" },
      { name: "active",   type: "uint256" },
      { name: "claims",   type: "uint256" },
      { name: "approved", type: "uint256" },
      { name: "payouts",  type: "uint256" },
    ],
  },
  {
    name: "getUserPolicies",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getUserClaims",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getPolicyHandles",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      { name: "age",       type: "uint256" },
      { name: "riskScore", type: "uint256" },
      { name: "coverage",  type: "uint256" },
      { name: "premium",   type: "uint256" },
    ],
  },
  {
    name: "getClaimHandles",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "claimId", type: "uint256" }],
    outputs: [
      { name: "amount",   type: "uint256" },
      { name: "severity", type: "uint256" },
      { name: "payout",   type: "uint256" },
      { name: "valid",    type: "uint256" },
    ],
  },
  {
    name: "policies",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "holder",          type: "address" },
      { name: "encryptedAge",    type: "uint256" },
      { name: "encryptedRiskScore", type: "uint256" },
      { name: "encryptedCoverage",  type: "uint256" },
      { name: "encryptedPremium",   type: "uint256" },
      { name: "premiumPaidUntil", type: "uint256" },
      { name: "status",           type: "uint8" },
      { name: "createdAt",        type: "uint256" },
    ],
  },
  {
    name: "claims",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "policyId",   type: "uint256" },
      { name: "claimant",   type: "address" },
      { name: "encryptedClaimAmount", type: "uint256" },
      { name: "encryptedSeverity",    type: "uint256" },
      { name: "encryptedPayout",      type: "uint256" },
      { name: "isValid",    type: "uint256" },
      { name: "status",     type: "uint8" },
      { name: "filedAt",    type: "uint256" },
    ],
  },
  // Public state variables
  { name: "poolBalance",          type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalPolicies",        type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalActivePolicies",  type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalClaims",          type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalApprovedClaims",  type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalPayouts",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "PREMIUM_UNIT",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "BASE_PREMIUM",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint64" }] },
  { name: "RISK_DENOMINATOR",     type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint64" }] },
  { name: "MIN_SEVERITY",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint64" }] },

  // ── Events ──────────────────────────────────────────────────────────────
  {
    name: "PolicyRegistered",
    type: "event",
    inputs: [
      { name: "policyId",  type: "uint256", indexed: true },
      { name: "holder",    type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PremiumPaid",
    type: "event",
    inputs: [
      { name: "policyId",  type: "uint256", indexed: true },
      { name: "periodEnd", type: "uint256", indexed: false },
      { name: "amount",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "ClaimFiled",
    type: "event",
    inputs: [
      { name: "claimId",   type: "uint256", indexed: true },
      { name: "policyId",  type: "uint256", indexed: true },
      { name: "claimant",  type: "address", indexed: true },
    ],
  },
  {
    name: "ClaimValidated",
    type: "event",
    inputs: [
      { name: "claimId",  type: "uint256", indexed: true },
      { name: "approved", type: "bool",    indexed: false },
    ],
  },
  {
    name: "ClaimPaid",
    type: "event",
    inputs: [
      { name: "claimId",  type: "uint256", indexed: true },
      { name: "claimant", type: "address", indexed: true },
      { name: "amount",   type: "uint256", indexed: false },
    ],
  },
  {
    name: "PoolFunded",
    type: "event",
    inputs: [
      { name: "funder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
