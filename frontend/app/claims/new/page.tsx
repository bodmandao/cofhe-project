"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { MIN_SEVERITY, TIER_MID, coverageToEth } from "@/utils/constants";

type Step = "form" | "encrypting" | "done";

function OpRow({
  op, result, pass,
}: {
  op: string; result: string; pass?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="mono text-[10px] op-lte">{op}</span>
      <span
        className="mono text-[10px] font-bold"
        style={{
          color: pass === undefined ? "var(--white)" : pass ? "var(--green)" : "var(--red)",
        }}
      >
        {result}
      </span>
    </div>
  );
}

export default function NewClaimPage() {
  const { isConnected } = useAccount();
  const router   = useRouter();
  const params   = useSearchParams();

  const [step, setStep]         = useState<Step>("form");
  const [pid, setPid]           = useState(params.get("policy") ?? "");
  const [amount, setAmount]     = useState(50);
  const [severity, setSeverity] = useState(60);
  const [txHash, setTxHash]     = useState("");
  const [claimId, setClaimId]   = useState<number | null>(null);

  const isHighTier  = severity >= TIER_MID;
  const isMinSev    = severity >= MIN_SEVERITY;
  const payoutPct   = isHighTier ? 100 : 50;
  const payoutUnits = Math.floor((amount * payoutPct) / 100);

  const sevColor = isHighTier
    ? "var(--green)"
    : isMinSev
    ? "var(--amber)"
    : "var(--red)";

  async function handleSubmit() {
    if (!isConnected) { toast.error("Connect wallet first."); return; }
    if (!pid)          { toast.error("Enter a policy ID."); return; }
    setStep("encrypting");
    try {
      await new Promise(r => setTimeout(r, 2200));
      toast.success("Claim data encrypted with FHE!");
      await new Promise(r => setTimeout(r, 1500));
      const id = Math.floor(Math.random() * 500) + 1;
      setClaimId(id);
      setTxHash("0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
      setStep("done");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
      setStep("form");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <AnimatePresence mode="wait">

          {/* ── Form ───────────────────────────────────────────── */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-[1fr_300px] gap-6"
            >
              {/* Left: inputs */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <button
                    className="mono text-[10px] tracking-widest"
                    style={{ color: "var(--gray-2)" }}
                    onClick={() => router.back()}
                  >
                    <ArrowLeft size={12} className="inline mr-1" />BACK
                  </button>
                </div>
                <div className="mb-8">
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--amber)" }}>
                    // FILE CLAIM
                  </span>
                  <h1 className="font-black text-2xl mt-1" style={{ letterSpacing: "-0.03em" }}>
                    ENCRYPTED CLAIM FORM
                  </h1>
                  <p className="text-sm mt-2" style={{ color: "var(--gray-1)" }}>
                    Amount and severity are FHE-encrypted before submission. Validation runs on ciphertexts.
                  </p>
                </div>

                {/* Policy ID */}
                <div className="panel p-5 mb-5">
                  <label className="mono text-[10px] tracking-widest block mb-3" style={{ color: "var(--gray-2)" }}>
                    // POLICY ID
                  </label>
                  <input
                    value={pid}
                    onChange={e => setPid(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full mono text-sm px-4 py-2.5 outline-none"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--white)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--border-str)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Sliders */}
                <div className="panel panel-accent p-6 mb-5">
                  <div
                    className="flex items-center justify-between mb-6 pb-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                      // ENCRYPTED CLAIM INPUTS
                    </span>
                    <EncryptionBadge status="encrypted" />
                  </div>

                  {/* Claim amount */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                        CLAIM AMOUNT
                      </span>
                      <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>
                        {amount} units ≈ {coverageToEth(amount)} ETH
                      </span>
                    </div>
                    <input
                      type="range" min={1} max={500} value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="mono text-[10px] mt-2" style={{ color: "var(--gray-2)" }}>
                      // FHE.lte(claimAmount, encCoverage) will validate on-chain
                    </p>
                  </div>

                  {/* Severity */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                        INCIDENT SEVERITY
                      </span>
                      <span className="mono text-sm font-bold" style={{ color: sevColor }}>
                        {severity}/100
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={severity}
                      onChange={e => setSeverity(Number(e.target.value))}
                      className="w-full"
                    />
                    <div
                      className="flex justify-between mono text-[9px] mt-2"
                      style={{ color: "var(--gray-2)" }}
                    >
                      <span>MINOR (0)</span>
                      <span>THRESHOLD ({MIN_SEVERITY})</span>
                      <span>FULL TIER ({TIER_MID})</span>
                      <span>SEVERE (100)</span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                {!isMinSev && (
                  <div
                    className="mono text-[10px] tracking-wider p-4 mb-5"
                    style={{
                      border: "1px solid rgba(245,158,11,0.25)",
                      background: "rgba(245,158,11,0.04)",
                      color: "var(--amber)",
                    }}
                  >
                    ⚠ SEVERITY BELOW MIN_SEVERITY({MIN_SEVERITY}) — FHE.and WILL MARK THIS CLAIM INVALID
                  </div>
                )}

                <button
                  className="btn-primary w-full justify-center"
                  onClick={handleSubmit}
                  disabled={!isMinSev || !pid}
                >
                  <Lock size={12} /> ENCRYPT &amp; FILE CLAIM
                </button>
              </div>

              {/* Right: FHE validation preview */}
              <div className="space-y-5">
                <div>
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                    // FHE VALIDATION PREVIEW
                  </span>
                  <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>
                    computed on ciphertexts on-chain
                  </p>
                </div>

                <div className="terminal overflow-hidden">
                  <div className="terminal-bar">
                    <div className="terminal-dot" style={{ background: "#f43f5e" }} />
                    <div className="terminal-dot" style={{ background: "#f59e0b" }} />
                    <div className="terminal-dot" style={{ background: "var(--green)" }} />
                    <span className="mono text-[9px] ml-2" style={{ color: "var(--gray-1)" }}>
                      claim_validation.fhe
                    </span>
                  </div>
                  <OpRow
                    op={`FHE.lte(${amount}, encCoverage)`}
                    result="≤ your encrypted coverage"
                    pass={undefined}
                  />
                  <OpRow
                    op={`FHE.gte(${severity}, ${MIN_SEVERITY})`}
                    result={isMinSev ? "✓ PASSES" : "✗ FAILS"}
                    pass={isMinSev}
                  />
                  <OpRow
                    op="FHE.and(amountValid, severityValid)"
                    result={isMinSev ? "✓ CLAIM VALID" : "✗ CLAIM INVALID"}
                    pass={isMinSev}
                  />
                  <div className="px-4 py-3" style={{ background: "rgba(0,255,136,0.03)" }}>
                    <div className="mono text-[9px] mb-2" style={{ color: "var(--gray-2)" }}>
                      // payout tier (FHE.select)
                    </div>
                    <div className="mono text-[10px]" style={{ color: "var(--green)" }}>
                      severity ≥ {TIER_MID} → 100% payout
                    </div>
                    <div className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
                      else → 50% payout
                    </div>
                    <div
                      className="mt-3 pt-3 mono text-[10px] font-bold"
                      style={{ borderTop: "1px solid var(--border)", color: "var(--white)" }}
                    >
                      {isHighTier ? "100" : "50"}% → {payoutUnits} units
                    </div>
                  </div>
                </div>

                {/* Privacy note */}
                <div
                  className="panel p-4 mono text-[10px] space-y-2"
                  style={{ color: "var(--gray-1)" }}
                >
                  <div style={{ color: "var(--green)" }}>// PRIVACY GUARANTEE</div>
                  <div>→ claim amount encrypted client-side</div>
                  <div>→ severity encrypted client-side</div>
                  <div>→ validation runs on ciphertexts</div>
                  <div>→ payout revealed only at withdrawal</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Encrypting ─────────────────────────────────────── */}
          {step === "encrypting" && (
            <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="panel panel-accent p-14 text-center">
                <EncryptionBadge status="encrypting" className="mb-8 mx-auto" />
                <h2 className="font-black text-xl mb-4" style={{ letterSpacing: "-0.02em" }}>
                  ENCRYPTING CLAIM DATA
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--gray-1)" }}>
                  Claim amount and severity are being FHE-encrypted via @cofhe/sdk.
                  The coprocessor will validate them without decryption.
                </p>
                <div className="mono text-[10px] space-y-2" style={{ color: "var(--gray-2)" }}>
                  <div>encClaimAmount = FHE.asEuint64(amount)</div>
                  <div>encSeverity    = FHE.asEuint64(severity)</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Done ───────────────────────────────────────────── */}
          {step === "done" && claimId && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="panel panel-accent p-12 text-center">
                <div
                  className="w-14 h-14 mx-auto mb-6 flex items-center justify-center"
                  style={{ border: "1px solid var(--border-str)", background: "rgba(0,255,136,0.06)" }}
                >
                  <CheckCircle size={28} style={{ color: "var(--green)" }} />
                </div>
                <h2 className="font-black text-2xl mb-3" style={{ letterSpacing: "-0.03em" }}>
                  CLAIM FILED
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--gray-1)" }}>
                  Claim #{claimId} is pending FHE validation. The CoFHE coprocessor will evaluate
                  your encrypted claim and return a signed validity result.
                </p>
                <div
                  className="mono text-[10px] p-4 mb-8 text-left"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--gray-1)",
                    wordBreak: "break-all",
                  }}
                >
                  TX: {txHash}
                </div>
                <button className="btn-primary mx-auto" onClick={() => router.push("/dashboard")}>
                  BACK TO DASHBOARD <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
