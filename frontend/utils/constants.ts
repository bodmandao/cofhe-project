import { arbitrumSepolia, sepolia } from "wagmi/chains";

// ── Contract Addresses ─────────────────────────────────────────────────────
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  [arbitrumSepolia.id]: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_ARB_SEPOLIA || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  [sepolia.id]:         (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_ETH_SEPOLIA  || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

// ── Protocol Constants (must match ConfidentialInsurance.sol) ──────────────
export const BASE_PREMIUM     = 5n;
export const RISK_DENOMINATOR = 100n;
export const MIN_SEVERITY     = 30;
export const TIER_MID         = 70;
export const PREMIUM_UNIT_WEI = 100_000_000_000_000n; // 0.0001 ETH in wei

// ── UI Helpers ─────────────────────────────────────────────────────────────
export const RISK_LABELS: Record<string, string> = {
  low:    "Low Risk (1–30)",
  medium: "Moderate Risk (31–70)",
  high:   "High Risk (71–100)",
};

export function getRiskLabel(score: number): string {
  if (score <= 30) return "Low";
  if (score <= 70) return "Moderate";
  return "High";
}

export function getRiskColor(score: number): string {
  if (score <= 30) return "#10b981"; // green
  if (score <= 70) return "#f59e0b"; // amber
  return "#ef4444";                  // red
}

export function estimatePremium(riskScore: number, coverage: number): number {
  return Number(BASE_PREMIUM) + Math.floor((riskScore * coverage) / Number(RISK_DENOMINATOR));
}

export function premiumToEth(units: number): string {
  return (units * 0.0001).toFixed(4);
}

export function coverageToEth(units: number): string {
  return (units * 0.0001).toFixed(2);
}

export const SUPPORTED_CHAINS = [arbitrumSepolia, sepolia];

export const POLICY_STATUS_MAP: Record<number, string> = {
  0: "Active",
  1: "Expired",
  2: "Cancelled",
};

export const CLAIM_STATUS_MAP: Record<number, string> = {
  0: "Pending",
  1: "Approved",
  2: "Rejected",
  3: "Paid",
};

export const CLAIM_STATUS_COLOR: Record<number, string> = {
  0: "#f59e0b",  // amber — pending
  1: "#10b981",  // green — approved
  2: "#ef4444",  // red   — rejected
  3: "#00e5ff",  // cyan  — paid
};
