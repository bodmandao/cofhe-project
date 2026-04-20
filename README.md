# ShieldFi — Confidential Insurance Protocol

> Privacy-preserving DeFi insurance powered by Fhenix CoFHE.  
> Your risk profile, coverage amount, and claim details are computed entirely on encrypted data — no plaintext ever enters the contract.

---

## The Problem

Traditional insurance requires you to hand over sensitive personal data — age, health conditions, risk history — to price a policy. On-chain, that problem is worse: everything is permanently public.

**ShieldFi solves this with Fully Homomorphic Encryption.**  
The smart contract computes your premium by multiplying, dividing, and adding encrypted integers. It validates claims by comparing encrypted amounts. It selects payout tiers using encrypted conditionals. At no point does the protocol see your plaintext data.

---

## How It Works

```
User Device                     Fhenix CoFHE Chain
────────────────                ─────────────────────────────────────────────
                                
 1. Describe risk  ──Claude──▶  AI estimates riskScore (stays off-chain)
                                
 2. Encrypt inputs              registerPolicy(encAge, encRiskScore, encCoverage)
    via @cofhe/sdk ────────────▶  FHE.mul(riskScore, coverage)
                                  FHE.div(product, 100)
                                  FHE.add(BASE=5, riskComponent)
                                  → encryptedPremium stored on-chain
                                
 3. Reveal premium              revealPremium() → CoFHE threshold decrypt
    (only you)    ◀────────────  FHE.publishDecryptResult
                                
 4. File a claim                fileClaim(encClaimAmount, encSeverity)
    (encrypted)   ────────────▶  FHE.lte(claimAmount, coverage)
                                  FHE.gte(severity, MIN_SEVERITY=30)
                                  FHE.and(amountValid, severityValid)
                                  FHE.select(severity≥70, fullPayout, halfPayout)
                                
 5. Withdraw payout             withdrawPayout() — amount revealed only now
                  ◀────────────  ETH transfer
```

---

## FHE Operations Used

| Operation | Where | What it does |
|---|---|---|
| `FHE.asEuint64` | Registration | Converts encrypted inputs + constants |
| `FHE.mul` | Premium | `riskScore × coverage` |
| `FHE.div` | Premium | Normalise by `RISK_DENOMINATOR = 100` |
| `FHE.add` | Premium | `BASE_PREMIUM(5) + riskComponent` |
| `FHE.lte` | Claim | `claimAmount ≤ encryptedCoverage` |
| `FHE.gte` | Claim | `severity ≥ MIN_SEVERITY(30)` |
| `FHE.and` | Claim | Gate both validity conditions |
| `FHE.select` | Payout | `severity ≥ 70 → 100% | else → 50%` |
| `FHE.allowThis/allowSender` | ACL | Contract + holder access only |
| `FHE.publishDecryptResult` | Reveal | CoFHE threshold network reveal |
| `FHE.getDecryptResultSafe` | Read | Read decrypted value on-chain |

---

## Project Structure

```
EPSV/
├── cofhe-hardhat-starter/          # Solidity contracts + Hardhat workspace
│   ├── contracts/
│   │   ├── ConfidentialInsurance.sol   ← main protocol
│   │   └── Counter.sol                 (Fhenix starter example)
│   ├── tasks/
│   │   ├── deploy-insurance.ts
│   │   ├── register-policy.ts
│   │   └── file-claim.ts
│   └── test/
│       └── Insurance.test.ts           (14 FHE verification tests)
│
└── frontend/                       # Next.js 15 dApp
    ├── app/
    │   ├── page.tsx                    landing page
    │   ├── dashboard/page.tsx          policy + claims dashboard
    │   ├── policy/new/page.tsx         AI-guided policy wizard
    │   ├── claims/new/page.tsx         encrypted claim filing
    │   └── api/risk-assess/route.ts    Claude AI server route
    ├── components/
    │   ├── AIRiskAdvisor.tsx           Claude-powered risk chat
    │   ├── Navbar.tsx
    │   ├── PoolStats.tsx               live on-chain aggregates
    │   └── ui/
    │       ├── GlassCard.tsx
    │       ├── GlassButton.tsx
    │       └── EncryptionBadge.tsx
    ├── hooks/
    │   └── useInsurance.ts             wagmi contract hooks
    └── utils/
        ├── abi.ts
        └── constants.ts
```

---

## Privacy Model

| Data | Visibility |
|---|---|
| Age | Encrypted — only policy holder can decrypt |
| Risk score | Encrypted — only policy holder can decrypt |
| Coverage amount | Encrypted — only policy holder can decrypt |
| Premium | FHE-computed, encrypted — holder reveals on demand |
| Claim amount | Encrypted — never revealed except at payout |
| Claim severity | Encrypted — never revealed |
| Payout amount | Encrypted during validation — revealed only at withdrawal |
| Pool balance | **Public** aggregate only |
| Total policies | **Public** aggregate only |
| Total payouts | **Public** aggregate only |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm
- A private key with testnet ETH on Arbitrum Sepolia or Ethereum Sepolia

---

### 1. Contracts

```bash
cd cofhe-hardhat-starter
pnpm install
```

**Run tests locally (CoFHE mock environment):**

```bash
pnpm test
# or with gas reporting:
REPORT_GAS=true pnpm test
```

**Deploy to Arbitrum Sepolia:**

```bash
cp .env.example .env
# fill in PRIVATE_KEY and ARBISCAN_API_KEY
pnpm arb-sepolia:deploy-counter          # starter example
npx hardhat deploy-insurance --network arb-sepolia --fund 0.1
```

**Register a test policy:**

```bash
npx hardhat register-policy \
  --network arb-sepolia \
  --age 35 \
  --risk 60 \
  --coverage 100
```

**File a test claim:**

```bash
npx hardhat file-claim \
  --network arb-sepolia \
  --policy 1 \
  --amount 80 \
  --severity 75
```

---

### 2. Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_id
NEXT_PUBLIC_CONTRACT_ADDRESS_ARB_SEPOLIA=0x...   # from deploy step
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
pnpm dev   # starts with Turbopack
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Flow

1. **Landing** → read about the protocol and see live pool stats
2. **Get Insured** → describe your situation to Claude AI (off-chain)
3. Claude estimates your risk score and recommended coverage
4. Adjust the sliders — preview your estimated premium
5. **Encrypt & Register** — inputs encrypted via `@cofhe/sdk` before wallet prompt
6. **Dashboard** — see your active policies (all values show as encrypted)
7. **Reveal Premium** — 3-step CoFHE decrypt flow; only you see the result
8. **File Claim** — encrypted amount + severity; FHE validation preview shown live
9. **Withdraw** — payout revealed only at transfer

---

## Protocol Constants

| Constant | Value | Description |
|---|---|---|
| `BASE_PREMIUM` | `5 units` | Flat base rate per period |
| `RISK_DENOMINATOR` | `100` | Normaliser for risk component |
| `MIN_SEVERITY` | `30 / 100` | Minimum incident severity to file |
| `TIER_MID` | `70 / 100` | Threshold for full (100%) payout |
| `PREMIUM_UNIT` | `0.0001 ETH` | ETH value of 1 premium unit |

**Premium formula:** `BASE(5) + (riskScore × coverage) ÷ 100`

Examples:

| Risk | Coverage | Premium | ETH/month |
|---|---|---|---|
| 30 | 100 | 35 units | 0.0035 ETH |
| 50 | 100 | 55 units | 0.0055 ETH |
| 80 | 200 | 165 units | 0.0165 ETH |

---

## Tech Stack

**Contracts**
- Solidity 0.8.28
- `@fhenixprotocol/cofhe-contracts` — FHE primitives
- `@cofhe/hardhat-plugin` — local CoFHE mock environment
- `@cofhe/sdk` — client-side encryption + decryption
- Hardhat + hardhat-toolbox

**Frontend**
- Next.js 15 (App Router, Turbopack)
- wagmi v2 + viem v2 + RainbowKit v2
- `@cofhe/sdk` — in-browser FHE encryption
- Anthropic SDK (`claude-sonnet-4-6`) — AI risk assessment
- Framer Motion — animations
- Tailwind CSS 4 — glassmorphism design system

**Supported Networks**
- Arbitrum Sepolia (primary — Fhenix CoFHE)
- Ethereum Sepolia

---

## Architecture Decisions

**Why FHE and not ZK proofs?**  
ZK proofs can verify a statement ("my score is above X") but cannot compute a new value from two hidden inputs. The ShieldFi premium formula requires `riskScore × coverage ÷ 100` — multiplication of two unknown encrypted values. Only FHE supports this.

**Why Claude AI off-chain?**  
The AI risk advisor helps users understand what numbers to enter. The actual numbers are encrypted before they leave the browser. Claude never sees wallet addresses, on-chain state, or any submitted ciphertext.

**Why aggregate-only public stats?**  
Pool health (balance, total policies, total payouts) must be public so users can assess protocol solvency. Individual policy details are never surfaced — only the encrypted ciphertext handles exist on-chain.

---

## Hackathon Context

Built for the **Fhenix Wave Hackathon**.  
Application area: **Confidential DeFi** — the first FHE-native insurance protocol.  
This use case is impossible on any transparent chain: premium computation and claim validation require arithmetic on two unknown private inputs simultaneously.

---

## License

MIT
