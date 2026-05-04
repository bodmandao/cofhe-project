"use client";

import { useState } from "react";
import { useReadContract, useChainId } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import { INSURANCE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES } from "@/utils/constants";

// ── FHE op display ────────────────────────────────────────────────────────
const OPS = [
  {
    op: "FHE.asEuint64",
    color: "var(--green)",
    desc: "Wraps plaintext or an inEuint64 handle into a ciphertext living in CoFHE memory. Called on every user input: age, riskScore, coverage, claimAmount, severity.",
    example: "encAge = FHE.asEuint64(inAge)",
    used: ["registerPolicy", "fileClaim"],
  },
  {
    op: "FHE.mul",
    color: "var(--violet)",
    desc: "Homomorphic multiplication. Used to compute the raw risk component: riskScore × coverage entirely on ciphertexts.",
    example: "riskComponent = FHE.mul(encRiskScore, encCoverage)",
    used: ["registerPolicy"],
  },
  {
    op: "FHE.div",
    color: "var(--blue)",
    desc: "Homomorphic division. Normalises the risk component by RISK_DENOMINATOR(100) and the actuarial pool average by ACTUARIAL_DIVISOR(20).",
    example: "norm = FHE.div(riskComponent, FHE.asEuint64(100))",
    used: ["registerPolicy", "_computeDynamicBase"],
  },
  {
    op: "FHE.add",
    color: "var(--green)",
    desc: "Homomorphic addition. Combines base premium + normalised risk to get total premium. Also used by the actuarial engine accumulator.",
    example: "premium = FHE.add(dynamicBase, norm)",
    used: ["registerPolicy", "_computeDynamicBase"],
  },
  {
    op: "FHE.sub",
    color: "var(--amber)",
    desc: "Homomorphic subtraction. Called in cancelPolicy to remove a policy's risk score from the encrypted pool accumulator.",
    example: "_poolRiskAccumulator = FHE.sub(_poolRiskAccumulator, encRiskScore)",
    used: ["cancelPolicy"],
  },
  {
    op: "FHE.lte",
    color: "var(--amber)",
    desc: "Encrypted less-than-or-equal. Validates that the claim amount does not exceed the policy's encrypted coverage — without decrypting either value.",
    example: "amountValid = FHE.lte(encClaimAmount, encCoverage)",
    used: ["fileClaim"],
  },
  {
    op: "FHE.gte",
    color: "var(--amber)",
    desc: "Encrypted greater-than-or-equal. Validates that claim severity meets or exceeds MIN_SEVERITY(30) threshold.",
    example: "sevValid = FHE.gte(encSeverity, FHE.asEuint64(30))",
    used: ["fileClaim"],
  },
  {
    op: "FHE.and",
    color: "var(--red)",
    desc: "Encrypted boolean AND. Combines the amount-valid and severity-valid conditions into a single encrypted validity bit.",
    example: "isValid = FHE.and(amountValid, sevValid)",
    used: ["fileClaim"],
  },
  {
    op: "FHE.select",
    color: "var(--violet)",
    desc: "Encrypted conditional multiplexer. Selects between full coverage and 50% payout based on severity ≥ TIER_MID(70), computed entirely on ciphertexts.",
    example: "payout = FHE.select(isHighTier, encCoverage, FHE.div(encCoverage, FHE.asEuint64(2)))",
    used: ["fileClaim"],
  },
  {
    op: "FHE.allowPublic",
    color: "var(--green)",
    desc: "Grants the CoFHE coprocessor permission to decrypt a specific handle. Must be called before decryptForTx() off-chain.",
    example: "FHE.allowPublic(encPremium)",
    used: ["requestPremiumReveal", "requestPoolRiskReveal"],
  },
  {
    op: "FHE.publishDecryptResult",
    color: "var(--green)",
    desc: "Verifies the coprocessor's signed decryption result and stores the plaintext in the contract, ready for getDecryptResultSafe().",
    example: "FHE.publishDecryptResult(encPremium, plaintext, signature)",
    used: ["revealPremium", "revealPoolRisk"],
  },
];

// ── Decrypt flow steps ────────────────────────────────────────────────────
const DECRYPT_FLOW = [
  {
    step: "01",
    title: "requestPremiumReveal()",
    chain: "on-chain",
    color: "var(--green)",
    body: "Calls FHE.allowPublic(encPremium) — grants the CoFHE coprocessor ACL to read the ciphertext. No plaintext is exposed.",
  },
  {
    step: "02",
    title: "decryptForTx(handle).withoutPermit().execute()",
    chain: "off-chain SDK",
    color: "var(--violet)",
    body: "The @cofhe/sdk calls the CoFHE threshold network. The network decrypts the handle and returns { decryptedValue, signature }.",
  },
  {
    step: "03",
    title: "revealPremium(policyId, plaintext, signature)",
    chain: "on-chain",
    color: "var(--amber)",
    body: "FHE.publishDecryptResult() verifies the coprocessor's signature on-chain and stores the result. Anyone can now read it via getRevealedPremium().",
  },
];

function OpCard({ op, color, desc, example, used }: typeof OPS[0]) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="panel overflow-hidden"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <button
        className="w-full px-4 py-3 flex items-center justify-between gap-4"
        style={{ background: "transparent" }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span
            className="mono font-bold text-sm"
            style={{ color, fontVariantNumeric: "tabular-nums" }}
          >
            {op}
          </span>
          <span className="hidden sm:flex gap-1.5 flex-wrap">
            {used.map(u => (
              <span
                key={u}
                className="mono text-[9px] px-1.5 py-0.5"
                style={{ border: "1px solid var(--border-mid)", color: "var(--gray-2)" }}
              >
                {u}
              </span>
            ))}
          </span>
        </div>
        {open ? <ChevronUp size={12} style={{ color: "var(--gray-2)" }} /> : <ChevronDown size={12} style={{ color: "var(--gray-2)" }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--border)" }}
          >
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: "var(--gray-1)" }}>{desc}</p>
              <div
                className="mono text-[10px] px-3 py-2"
                style={{ background: "var(--surface-2)", color: color, wordBreak: "break-all" }}
              >
                {example}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HandleRow({ label, value, ready }: { label: string; value?: bigint | string; ready?: boolean }) {
  const display = value !== undefined
    ? `0x${value.toString(16).padStart(64, "0")}`
    : "—";
  return (
    <div
      className="grid grid-cols-[140px_1fr_60px] gap-4 items-center px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>{label}</span>
      <span
        className="mono text-[10px] enc-shimmer truncate"
        style={{ color: ready ? "var(--green)" : "var(--gray-3)" }}
      >
        {display}
      </span>
      <span
        className="mono text-[9px] text-right"
        style={{ color: ready ? "var(--green)" : "var(--gray-3)" }}
      >
        {ready ? "READY" : "PENDING"}
      </span>
    </div>
  );
}

export default function ExplorePage() {
  const chainId = useChainId();
  const address = CONTRACT_ADDRESSES[chainId];

  const { data: poolStats } = useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getPoolStats",
  });

  const { data: poolRisk } = useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getRevealedPoolRisk",
  });

  const { data: poolHandle } = useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getPoolRiskHandle",
  });

  const [balance, policies, active] = ((poolStats as unknown) as bigint[]) ?? [];
  const [poolRiskValue, poolRiskReady] = ((poolRisk as unknown) as [bigint, boolean]) ?? [];
  const [handleValue, handleInit]    = ((poolHandle as unknown) as [bigint, boolean]) ?? [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">

        {/* Header */}
        <div className="mb-12">
          <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
            // FHE PROOF EXPLORER
          </span>
          <h1
            className="font-black text-3xl mt-1 mb-4"
            style={{ letterSpacing: "-0.04em" }}
          >
            ENCRYPTED STATE VIEWER
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--gray-1)", lineHeight: 1.7 }}>
            Inspect every FHE operation, ciphertext handle, and decryption flow in the ShieldFi protocol.
            Individual policy data remains encrypted — only aggregate statistics and handle metadata are shown.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">

          {/* Left col */}
          <div className="space-y-8">

            {/* 3-step decrypt flow */}
            <section>
              <div className="mono text-[10px] tracking-widest mb-4" style={{ color: "var(--green)" }}>
                // 3-STEP COFHE DECRYPT FLOW
              </div>
              <div className="relative">
                {/* connector line */}
                <div
                  className="absolute left-[27px] top-8 bottom-8 w-px"
                  style={{ background: "var(--border-mid)" }}
                />
                <div className="space-y-3">
                  {DECRYPT_FLOW.map((f) => (
                    <div key={f.step} className="panel flex gap-4 p-4">
                      <div
                        className="mono text-[11px] font-black w-10 h-10 shrink-0 flex items-center justify-center z-10"
                        style={{
                          background: "var(--surface-2)",
                          border: `1px solid ${f.color}`,
                          color: f.color,
                        }}
                      >
                        {f.step}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="mono text-[10px] font-bold" style={{ color: f.color }}>
                            {f.title}
                          </span>
                          <span
                            className="mono text-[8px] px-1.5 py-0.5"
                            style={{ border: `1px solid ${f.color}40`, color: f.color, background: `${f.color}08` }}
                          >
                            {f.chain.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--gray-1)" }}>
                          {f.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FHE operations */}
            <section>
              <div className="mono text-[10px] tracking-widest mb-4" style={{ color: "var(--green)" }}>
                // ALL FHE OPERATIONS — click to expand
              </div>
              <div className="space-y-1.5">
                {OPS.map(o => <OpCard key={o.op} {...o} />)}
              </div>
            </section>

          </div>

          {/* Right col */}
          <div className="space-y-5">

            {/* Pool accumulator */}
            <div className="panel overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between mono text-[10px] tracking-widest"
                style={{ borderBottom: "1px solid var(--border)", color: "var(--gray-1)" }}
              >
                <span style={{ color: "var(--green)" }}>// POOL RISK ACCUMULATOR</span>
                <span
                  className="px-2 py-0.5"
                  style={{
                    background: handleInit ? "rgba(0,255,136,0.07)" : "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-str)",
                    color: handleInit ? "var(--green)" : "var(--gray-3)",
                    fontSize: 9,
                  }}
                >
                  {handleInit ? "ACTIVE" : "UNINIT"}
                </span>
              </div>

              <div className="px-4 py-3 space-y-2">
                <div className="mono text-[9px] tracking-wider" style={{ color: "var(--gray-2)" }}>
                  CIPHERTEXT HANDLE
                </div>
                <div
                  className="mono text-[10px] p-2 enc-shimmer break-all"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: handleInit ? "var(--green)" : "var(--gray-3)",
                    minHeight: 56,
                  }}
                >
                  {handleInit && handleValue !== undefined
                    ? `0x${handleValue.toString(16).padStart(64, "0")}`
                    : "// no policies registered yet"}
                </div>
              </div>

              <HandleRow label="POOL RISK" value={poolRiskReady ? poolRiskValue : undefined} ready={poolRiskReady} />

              <div
                className="px-4 py-3 mono text-[9px] space-y-1"
                style={{ color: "var(--gray-2)", borderTop: "1px solid var(--border)" }}
              >
                <div>formula: FHE.add accumulator of all active riskScores</div>
                <div>avg = FHE.div(accumulator, totalActivePolicies)</div>
                <div>adjustment = FHE.div(avg, ACTUARIAL_DIVISOR=20)</div>
                <div style={{ color: "var(--green)" }}>dynamicBase = BASE(5) + adjustment</div>
              </div>
            </div>

            {/* Protocol stats */}
            <div className="panel overflow-hidden">
              <div
                className="px-4 py-3 mono text-[10px] tracking-widest"
                style={{ borderBottom: "1px solid var(--border)", color: "var(--green)" }}
              >
                // LIVE PROTOCOL STATE
              </div>
              {[
                { label: "TOTAL POLICIES",  value: policies?.toString() ?? "—" },
                { label: "ACTIVE POLICIES", value: active?.toString()   ?? "—" },
                { label: "POOL BALANCE",    value: balance !== undefined ? `${(Number(balance) / 1e18).toFixed(4)} ETH` : "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="px-4 py-2.5 flex items-center justify-between row-hover"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>{label}</span>
                  <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{value}</span>
                </div>
              ))}
              <div
                className="px-4 py-2 mono text-[9px]"
                style={{ color: "var(--gray-2)", background: "rgba(0,255,136,0.02)" }}
              >
                individual risk data fully encrypted
              </div>
            </div>

            {/* FHE circuit legend */}
            <div className="panel p-4">
              <div className="mono text-[10px] tracking-widest mb-4" style={{ color: "var(--green)" }}>
                // FHE CIRCUIT LEGEND
              </div>
              <div className="space-y-2">
                {[
                  { label: "inEuint64",      color: "var(--green)",  desc: "encrypted input from client" },
                  { label: "euint64",         color: "var(--violet)", desc: "ciphertext in contract storage" },
                  { label: "ebool",           color: "var(--amber)",  desc: "encrypted boolean result" },
                  { label: "allowPublic",     color: "var(--blue)",   desc: "ACL grant to coprocessor" },
                  { label: "decryptResult",   color: "var(--green)",  desc: "verified plaintext on-chain" },
                ].map(({ label, color, desc }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-2 h-2 shrink-0" style={{ background: color }} />
                    <span className="mono text-[10px] font-bold shrink-0" style={{ color }}>{label}</span>
                    <span className="mono text-[9px]" style={{ color: "var(--gray-3)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
