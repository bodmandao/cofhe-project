"use client";

import { useReadContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { formatEther } from "viem";
import { INSURANCE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES } from "@/utils/constants";

const ROWS = [
  { key: "balance",  label: "POOL BALANCE",      fmt: (v: bigint) => `${parseFloat(formatEther(v)).toFixed(4)} ETH`, public: true },
  { key: "policies", label: "TOTAL POLICIES",    fmt: (v: bigint) => v.toString(),                                    public: true },
  { key: "active",   label: "ACTIVE POLICIES",   fmt: (v: bigint) => v.toString(),                                    public: true },
  { key: "claims",   label: "CLAIMS FILED",      fmt: (v: bigint) => v.toString(),                                    public: true },
  { key: "approved", label: "APPROVED CLAIMS",   fmt: (v: bigint) => v.toString(),                                    public: true },
  { key: "payouts",  label: "TOTAL PAYOUTS",     fmt: (v: bigint) => `${parseFloat(formatEther(v)).toFixed(4)} ETH`, public: true },
];

export default function PoolStats({ chainId = arbitrumSepolia.id }: { chainId?: number }) {
  const address = CONTRACT_ADDRESSES[chainId];

  const { data: stats } = useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getPoolStats",
  });

  const [balance = BigInt(0), policies = BigInt(0), active = BigInt(0), claims = BigInt(0), approved = BigInt(0), payouts = BigInt(0)] =
    ((stats as unknown) as bigint[]) ?? [];

  const values = [balance, policies, active, claims, approved, payouts];

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between mono text-[10px] tracking-widest"
        style={{ borderBottom: "1px solid var(--border)", color: "var(--gray-1)" }}
      >
        <span style={{ color: "var(--green)" }}>// LIVE PROTOCOL STATE</span>
        <span
          className="px-2 py-0.5"
          style={{ background: "rgba(0,255,136,0.07)", border: "1px solid var(--border-str)", color: "var(--green)", fontSize: 9 }}
        >
          PUBLIC AGGREGATES ONLY
        </span>
      </div>

      {/* Data rows */}
      {ROWS.map(({ label, fmt }, i) => (
        <div
          key={label}
          className="px-4 py-2.5 flex items-center justify-between row-hover"
          style={{ borderBottom: i < ROWS.length - 1 ? "1px solid var(--border)" : "none" }}
        >
          <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-1)" }}>
            {label}
          </span>
          <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>
            {fmt(values[i])}
          </span>
        </div>
      ))}

      <div
        className="px-4 py-2 mono text-[9px] tracking-wider"
        style={{ color: "var(--gray-2)", borderTop: "1px solid var(--border)", background: "rgba(0,255,136,0.02)" }}
      >
        individual risk data fully encrypted — only totals public
      </div>
    </div>
  );
}
