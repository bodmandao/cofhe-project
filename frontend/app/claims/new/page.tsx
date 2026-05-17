"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, useChainId, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { useCofheEncrypt } from "@cofhe/react";
import { Encryptable } from "@cofhe/sdk";
import { INSURANCE_ABI } from "@/utils/abi";
import { MIN_SEVERITY, TIER_MID, coverageToEth, CONTRACT_ADDRESSES } from "@/utils/constants";

type Step = "form" | "fraud-check" | "encrypting" | "done";

interface FraudResult {
  fraudScore: number;
  confidence: string;
  flags: string[];
  reasoning: string;
}

function OpRow({ op, result, pass }: { op: string; result: string; pass?: boolean }) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="mono text-[10px]">{op}</span>
      <span className="mono text-[10px] font-bold" style={{
        color: pass === undefined ? "var(--white)" : pass ? "var(--green)" : "var(--red)",
      }}>
        {result}
      </span>
    </div>
  );
}

function FraudMeter({ score }: { score: number }) {
  const color = score <= 30 ? "var(--green)" : score <= 70 ? "var(--amber)" : "var(--red)";
  const label = score <= 30 ? "LOW RISK" : score <= 70 ? "MEDIUM RISK" : "HIGH RISK — WILL FAIL";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
          FRAUD PROBABILITY
        </span>
        <span className="mono text-sm font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 w-full" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="h-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="mono text-[9px]" style={{ color }}>{label}</span>
    </div>
  );
}

export default function NewClaimPage() {
  const { isConnected } = useAccount();
  const chainId  = useChainId();
  const router   = useRouter();
  const params   = useSearchParams();

  const [step, setStep]           = useState<Step>("form");
  const [pid, setPid]             = useState(params.get("policy") ?? "");
  const [amount, setAmount]       = useState(50);
  const [severity, setSeverity]   = useState(60);
  const [description, setDesc]    = useState("");
  const [fraudResult, setFraud]   = useState<FraudResult | null>(null);
  const [fraudLoading, setFraudL] = useState(false);
  const [txHash, setTxHash]       = useState("");
  const [claimId, setClaimId]     = useState<number | null>(null);

  const { encryptInputsAsync } = useCofheEncrypt();
  const { writeContractAsync }  = useWriteContract();
  const address = CONTRACT_ADDRESSES[chainId];

  const { data: policyData } = useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "policies",
    args: [BigInt(pid || "0")],
    query: { enabled: !!pid },
  });
  const policyArr  = policyData as any[] | undefined;
  const premiumDue = policyArr && Number(policyArr[5]) < Date.now() / 1000;

  const isHighTier  = severity >= TIER_MID;
  const isMinSev    = severity >= MIN_SEVERITY;
  const payoutPct   = isHighTier ? 100 : 50;
  const payoutUnits = Math.floor((amount * payoutPct) / 100);
  const sevColor    = isHighTier ? "var(--green)" : isMinSev ? "var(--amber)" : "var(--red)";

  async function runFraudCheck() {
    if (!isConnected) { toast.error("Connect wallet first."); return; }
    if (!pid)         { toast.error("Enter a policy ID."); return; }
    if (!description.trim()) { toast.error("Add a claim description for fraud analysis."); return; }
    setFraudL(true);
    try {
      const res = await fetch("/api/fraud-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, policyId: pid, claimAmount: amount, severity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setFraud(data);
      setStep("fraud-check");
    } catch (e: any) {
      toast.error(e.message ?? "Fraud analysis failed");
    } finally {
      setFraudL(false);
    }
  }

  async function handleSubmit() {
    if (!fraudResult) return;
    setStep("encrypting");
    try {
      const [encAmount, encSeverity, encFraud] = await encryptInputsAsync([
        Encryptable.uint64(BigInt(amount)),
        Encryptable.uint64(BigInt(severity)),
        Encryptable.uint64(BigInt(fraudResult.fraudScore)),
      ]);
      toast.success("Claim data FHE-encrypted — sending transaction…");

      const hash = await writeContractAsync({
        address,
        abi: INSURANCE_ABI,
        functionName: "fileClaim",
        args: [BigInt(pid), encAmount as any, encSeverity as any, encFraud as any],
      });

      setTxHash(hash);
      setClaimId(1);
      setStep("done");
    } catch (err: any) {
      toast.error(err?.shortMessage ?? err?.message ?? "Failed");
      setStep("fraud-check");
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
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-[1fr_300px] gap-6">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <button className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}
                    onClick={() => router.back()}>
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
                    Claude analyses your description for fraud signals. All values are FHE-encrypted before submission.
                  </p>
                </div>

                {/* Policy ID */}
                <div className="panel p-5 mb-5">
                  <label className="mono text-[10px] tracking-widest block mb-3" style={{ color: "var(--gray-2)" }}>
                    // POLICY ID
                  </label>
                  <input value={pid} onChange={e => setPid(e.target.value)} placeholder="e.g. 1"
                    className="w-full mono text-sm px-4 py-2.5 outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--white)" }}
                    onFocus={e => (e.target.style.borderColor = "var(--border-str)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                </div>

                {/* Claim description */}
                <div className="panel p-5 mb-5">
                  <label className="mono text-[10px] tracking-widest block mb-3" style={{ color: "var(--amber)" }}>
                    // CLAIM DESCRIPTION (for Claude fraud analysis)
                  </label>
                  <textarea value={description} onChange={e => setDesc(e.target.value)}
                    rows={4} placeholder="Describe what happened — Claude will assess the claim for fraud indicators before submission."
                    className="w-full mono text-xs px-4 py-3 outline-none resize-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--white)" }}
                    onFocus={e => (e.target.style.borderColor = "var(--border-str)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                  <p className="mono text-[9px] mt-2" style={{ color: "var(--gray-3)" }}>
                    Description is used off-chain only. Claude returns an encrypted fraud score — not stored in plaintext.
                  </p>
                </div>

                {/* Sliders */}
                <div className="panel panel-accent p-6 mb-5">
                  <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                      // ENCRYPTED CLAIM INPUTS
                    </span>
                    <EncryptionBadge status="encrypted" />
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>CLAIM AMOUNT</span>
                      <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>
                        {amount} units ~ {coverageToEth(amount)} ETH
                      </span>
                    </div>
                    <input type="range" min={1} max={500} value={amount}
                      onChange={e => setAmount(Number(e.target.value))} className="w-full" />
                    <p className="mono text-[10px] mt-2" style={{ color: "var(--gray-2)" }}>
                      // FHE.lte(claimAmount, encCoverage)
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>INCIDENT SEVERITY</span>
                      <span className="mono text-sm font-bold" style={{ color: sevColor }}>{severity}/100</span>
                    </div>
                    <input type="range" min={0} max={100} value={severity}
                      onChange={e => setSeverity(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between mono text-[9px] mt-2" style={{ color: "var(--gray-2)" }}>
                      <span>MINOR (0)</span><span>THRESHOLD ({MIN_SEVERITY})</span>
                      <span>FULL TIER ({TIER_MID})</span><span>SEVERE (100)</span>
                    </div>
                  </div>
                </div>

                {!isMinSev && (
                  <div className="mono text-[10px] tracking-wider p-4 mb-5"
                    style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.04)", color: "var(--amber)" }}>
                    SEVERITY BELOW MIN_SEVERITY({MIN_SEVERITY}) — FHE.and WILL MARK THIS CLAIM INVALID
                  </div>
                )}

                {premiumDue && (
                  <div className="mono text-[10px] tracking-wider p-4 mb-5"
                    style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.05)", color: "#ef4444" }}>
                    PREMIUM OVERDUE — pay premium on the dashboard before filing a claim
                  </div>
                )}

                <button className="btn-primary w-full justify-center"
                  onClick={runFraudCheck}
                  disabled={!isMinSev || !pid || !!premiumDue || !description.trim() || fraudLoading}>
                  {fraudLoading ? (
                    <>
                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full"
                        style={{ animation: "spin 0.8s linear infinite" }} />
                      ANALYSING WITH CLAUDE…
                    </>
                  ) : (
                    <><ShieldAlert size={12} /> RUN FRAUD ANALYSIS</>
                  )}
                </button>
              </div>

              {/* Right: FHE preview */}
              <div className="space-y-5">
                <div>
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                    // FHE VALIDATION PREVIEW
                  </span>
                  <p className="mono text-[10px] mt-1" style={{ color: "var(--gray-2)" }}>computed on ciphertexts on-chain</p>
                </div>
                <div className="terminal overflow-hidden">
                  <div className="terminal-bar">
                    <div className="terminal-dot" style={{ background: "#f43f5e" }} />
                    <div className="terminal-dot" style={{ background: "#f59e0b" }} />
                    <div className="terminal-dot" style={{ background: "var(--green)" }} />
                    <span className="mono text-[9px] ml-2" style={{ color: "var(--gray-1)" }}>claim_validation.fhe</span>
                  </div>
                  <OpRow op={`FHE.lte(${amount}, encCoverage)`} result="<= your encrypted coverage" />
                  <OpRow op={`FHE.gte(${severity}, ${MIN_SEVERITY})`} result={isMinSev ? "PASSES" : "FAILS"} pass={isMinSev} />
                  <OpRow op="FHE.lte(encFraudScore, 70)" result="pending claude analysis" />
                  <OpRow op="FHE.and(amount, severity, fraud)" result={isMinSev ? "VALID" : "INVALID"} pass={isMinSev} />
                  <div className="px-4 py-3" style={{ background: "rgba(0,255,136,0.03)" }}>
                    <div className="mono text-[9px] mb-2" style={{ color: "var(--gray-2)" }}>// payout tier (FHE.select)</div>
                    <div className="mono text-[10px]" style={{ color: "var(--green)" }}>{"severity >= "}{TIER_MID}{" -> 100%"}</div>
                    <div className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>{"else -> 50%"}</div>
                    <div className="mt-3 pt-3 mono text-[10px] font-bold"
                      style={{ borderTop: "1px solid var(--border)", color: "var(--white)" }}>
                      {isHighTier ? "100" : "50"}{"% -> "}{payoutUnits}{" units"}
                    </div>
                  </div>
                </div>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
          )}

          {/* ── Fraud Check Result ──────────────────────────────── */}
          {step === "fraud-check" && fraudResult && (
            <motion.div key="fraud" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="panel panel-accent p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldAlert size={18} style={{ color: fraudResult.fraudScore > 70 ? "var(--red)" : "var(--amber)" }} />
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                    // CLAUDE FRAUD ORACLE RESULT
                  </span>
                </div>

                <FraudMeter score={fraudResult.fraudScore} />

                <div className="mt-6 mono text-[10px] p-4 space-y-1"
                  style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
                  <div style={{ color: "var(--green)" }}>// REASONING</div>
                  <div>{fraudResult.reasoning}</div>
                </div>

                {fraudResult.flags.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {fraudResult.flags.map((f, i) => (
                      <div key={i} className="mono text-[10px]" style={{ color: "var(--amber)" }}>
                        ! {f}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 mono text-[10px] p-4"
                  style={{ background: "rgba(0,255,136,0.03)", border: "1px solid var(--border-str)", color: "var(--gray-2)" }}>
                  <div style={{ color: "var(--green)" }}>// FHE GATE</div>
                  <div>FHE.lte(encFraudScore({fraudResult.fraudScore}), FRAUD_THRESHOLD(70))</div>
                  <div style={{ color: fraudResult.fraudScore <= 70 ? "var(--green)" : "var(--red)" }}>
                    {fraudResult.fraudScore <= 70 ? "-> PASSES gate" : "-> FAILS gate — claim will be invalid"}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn-ghost" onClick={() => setStep("form")}>
                  <ArrowLeft size={12} /> EDIT CLAIM
                </button>
                <button className="btn-primary flex-1 justify-center"
                  onClick={handleSubmit}
                  disabled={fraudResult.fraudScore > 70}>
                  <Lock size={12} />
                  {fraudResult.fraudScore > 70 ? "CLAIM BLOCKED BY FRAUD GATE" : "ENCRYPT & FILE CLAIM"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Encrypting ─────────────────────────────────────── */}
          {step === "encrypting" && (
            <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="panel panel-accent p-14 text-center">
                <EncryptionBadge status="encrypting" className="mb-8 mx-auto" />
                <h2 className="font-black text-xl mb-4" style={{ letterSpacing: "-0.02em" }}>ENCRYPTING CLAIM DATA</h2>
                <p className="text-sm mb-8" style={{ color: "var(--gray-1)" }}>
                  Amount, severity, and fraud score are being FHE-encrypted via @cofhe/sdk.
                </p>
                <div className="mono text-[10px] space-y-2" style={{ color: "var(--gray-2)" }}>
                  <div>encClaimAmount = FHE.asEuint64(amount)</div>
                  <div>encSeverity    = FHE.asEuint64(severity)</div>
                  <div>encFraudScore  = FHE.asEuint64(fraudScore)</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Done ───────────────────────────────────────────── */}
          {step === "done" && claimId && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="panel panel-accent p-12 text-center">
                <div className="w-14 h-14 mx-auto mb-6 flex items-center justify-center"
                  style={{ border: "1px solid var(--border-str)", background: "rgba(0,255,136,0.06)" }}>
                  <CheckCircle size={28} style={{ color: "var(--green)" }} />
                </div>
                <h2 className="font-black text-2xl mb-3" style={{ letterSpacing: "-0.03em" }}>CLAIM FILED</h2>
                <p className="text-sm mb-8" style={{ color: "var(--gray-1)" }}>
                  Claim #{claimId} is pending FHE validation. Three gates are active: amount, severity, and fraud score.
                </p>
                <div className="mono text-[10px] p-4 mb-8 text-left"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--gray-1)", wordBreak: "break-all" }}>
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
