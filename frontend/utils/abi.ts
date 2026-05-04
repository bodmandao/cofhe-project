export const INSURANCE_ABI =  [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "ClaimAlreadyProcessed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "ClaimNotApproved",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "ClaimNotFound",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InsufficientPool",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "got",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "expected",
          "type": "uint8"
        }
      ],
      "name": "InvalidEncryptedInput",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "NotClaimant",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "NotPolicyHolder",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "PayoutNotDecrypted",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "PolicyNotActive",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "PolicyNotFound",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "PremiumOverdue",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "int32",
          "name": "value",
          "type": "int32"
        }
      ],
      "name": "SecurityZoneOutOfBounds",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "claimant",
          "type": "address"
        }
      ],
      "name": "ClaimFiled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "claimant",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "ClaimPaid",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "ClaimValidated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "name": "PolicyCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "holder",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "PolicyRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "funder",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PoolFunded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "periodEnd",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PremiumPaid",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "ACTUARIAL_DIVISOR",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "BASE_PREMIUM",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_SEVERITY",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "PREMIUM_UNIT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "RISK_DENOMINATOR",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "TIER_MID",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "name": "cancelPolicy",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "claims",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "claimant",
          "type": "address"
        },
        {
          "internalType": "euint64",
          "name": "encryptedClaimAmount",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "encryptedSeverity",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "encryptedPayout",
          "type": "bytes32"
        },
        {
          "internalType": "euint8",
          "name": "isValid",
          "type": "bytes32"
        },
        {
          "internalType": "enum ClaimStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "filedAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "ctHash",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "securityZone",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "utype",
              "type": "uint8"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            }
          ],
          "internalType": "struct InEuint64",
          "name": "encClaimAmount",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "ctHash",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "securityZone",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "utype",
              "type": "uint8"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            }
          ],
          "internalType": "struct InEuint64",
          "name": "encSeverity",
          "type": "tuple"
        }
      ],
      "name": "fileClaim",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "fundPool",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        }
      ],
      "name": "getClaimHandles",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "amount",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "severity",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "payout",
          "type": "bytes32"
        },
        {
          "internalType": "euint8",
          "name": "valid",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "name": "getPolicyHandles",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "age",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "riskScore",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "coverage",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "premium",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPoolRiskHandle",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "handle",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "initialized",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPoolStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "policies_",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "active",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "claims_",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "approved",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "payouts",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRevealedPoolRisk",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "ready",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "name": "getRevealedPremium",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "units",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "ready",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserClaims",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserPolicies",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "name": "payPremium",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "policies",
      "outputs": [
        {
          "internalType": "address",
          "name": "holder",
          "type": "address"
        },
        {
          "internalType": "euint64",
          "name": "encryptedAge",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "encryptedRiskScore",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "encryptedCoverage",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "encryptedPremium",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "premiumPaidUntil",
          "type": "uint256"
        },
        {
          "internalType": "enum PolicyStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "poolBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "plaintext",
          "type": "uint8"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "publishClaimValidity",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        },
        {
          "internalType": "uint64",
          "name": "plaintext",
          "type": "uint64"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "publishPayoutAmount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "ctHash",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "securityZone",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "utype",
              "type": "uint8"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            }
          ],
          "internalType": "struct InEuint64",
          "name": "encAge",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "ctHash",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "securityZone",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "utype",
              "type": "uint8"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            }
          ],
          "internalType": "struct InEuint64",
          "name": "encRiskScore",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "ctHash",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "securityZone",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "utype",
              "type": "uint8"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            }
          ],
          "internalType": "struct InEuint64",
          "name": "encCoverage",
          "type": "tuple"
        }
      ],
      "name": "registerPolicy",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "requestPoolRiskReveal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        }
      ],
      "name": "requestPremiumReveal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint64",
          "name": "plaintext",
          "type": "uint64"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "revealPoolRisk",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "policyId",
          "type": "uint256"
        },
        {
          "internalType": "uint64",
          "name": "plaintext",
          "type": "uint64"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "revealPremium",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalApprovedClaims",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalClaims",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalPayouts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalPolicies",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "claimId",
          "type": "uint256"
        }
      ],
      "name": "withdrawPayout",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    },

    // ── CommitteeManager errors ────────────────────────────────────────────
    {
      "inputs": [],
      "name": "NotCommitteeMember",
      "type": "error"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "claimId", "type": "uint256" }
      ],
      "name": "AlreadyVoted",
      "type": "error"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "claimId", "type": "uint256" }
      ],
      "name": "QuorumNotReached",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotCommitteeOwner",
      "type": "error"
    },

    // ── CommitteeManager events ────────────────────────────────────────────
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true,  "internalType": "address", "name": "member", "type": "address" }
      ],
      "name": "CommitteeMemberAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true,  "internalType": "address", "name": "member", "type": "address" }
      ],
      "name": "CommitteeMemberRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true,  "internalType": "uint256", "name": "claimId", "type": "uint256" },
        { "indexed": true,  "internalType": "address", "name": "member",  "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "total",   "type": "uint256" }
      ],
      "name": "ClaimVoteSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "claimId", "type": "uint256" }
      ],
      "name": "ClaimQuorumReached",
      "type": "event"
    },

    // ── CommitteeManager state views ───────────────────────────────────────
    {
      "inputs": [],
      "name": "committeeOwner",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "quorumThreshold",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "isCommitteeMember",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "name": "voteCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "name": "claimQuorumReached",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },

    // ── CommitteeManager functions ─────────────────────────────────────────
    {
      "inputs": [
        { "internalType": "uint256", "name": "claimId", "type": "uint256" }
      ],
      "name": "voteOnClaim",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "claimId", "type": "uint256" },
        { "internalType": "address", "name": "member",  "type": "address" }
      ],
      "name": "hasVoted",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCommitteeMembers",
      "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "member", "type": "address" }],
      "name": "addCommitteeMember",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "member", "type": "address" }],
      "name": "removeCommitteeMember",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "quorum", "type": "uint256" }],
      "name": "setQuorumThreshold",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },

    // ── ERC-721 events ─────────────────────────────────────────────────────
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "from",    "type": "address" },
        { "indexed": true, "internalType": "address", "name": "to",      "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "owner",    "type": "address" },
        { "indexed": true, "internalType": "address", "name": "approved", "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "tokenId",  "type": "uint256" }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "owner",    "type": "address" },
        { "indexed": true, "internalType": "address", "name": "operator", "type": "address" },
        { "indexed": false,"internalType": "bool",    "name": "approved", "type": "bool" }
      ],
      "name": "ApprovalForAll",
      "type": "event"
    },

    // ── ERC-721 functions ──────────────────────────────────────────────────
    {
      "inputs": [],
      "name": "name",
      "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
      "name": "tokenURI",
      "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
      "name": "ownerOf",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "from",    "type": "address" },
        { "internalType": "address", "name": "to",      "type": "address" },
        { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
      ],
      "name": "transferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "from",    "type": "address" },
        { "internalType": "address", "name": "to",      "type": "address" },
        { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "to",      "type": "address" },
        { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
      ],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
      "name": "getApproved",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "operator", "type": "address" },
        { "internalType": "bool",    "name": "approved", "type": "bool" }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "owner",    "type": "address" },
        { "internalType": "address", "name": "operator", "type": "address" }
      ],
      "name": "isApprovedForAll",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }],
      "name": "supportsInterface",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const;
