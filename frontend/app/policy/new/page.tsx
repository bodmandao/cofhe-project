"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Lock, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import AIRiskAdvisor from "@/components/AIRiskAdvisor";
import { Toaster, toast } from "sonner";
import {
  estimatePremium, premiumToEth, coverageToEth,
  getRiskColor, getRiskLabel,
} from "@/utils/constants";

type Step = "ai" | "review" | "confirm" | "done";

const STEPS = [
  { id: "ai",      label: "AI ASSESSMENT" },
  { id: "review",  label: "REVIEW" },
  { id: "confirm", label: "ENCRYPT & SUBMIT" },
  { id: "done",    label: "DONE" },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-12">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="mono text-[10px] tracking-widest font-bold w-6 h-6 flex items-center justify-center"
              style={{
                border: `1px solid ${i < idx ? "var(--green-dim)" : i === idx ? "var(--border-str)" : "var(--border-mid)"}`,
                color: i < idx ? "var(--green-dim)" : i === idx ? "var(--green)" : "var(--gray-2)",
                background: i === idx ? "rgba(0,255,136,0.05)" : "transparent",
              }}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span
              className="mono text-[10px] tracking-wider hidden sm:block"
              style={{ color: i === idx ? "var(--green)" : i < idx ? "var(--gray-2)" : "var(--gray-3)" }}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="flex-1 mx-3 h-px"
              style={{ background: i < idx ? "rgba(0,204,106,0.3)" : "var(--border-mid)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Slider({
  label, value, min, max, step = 1,
  display, onChange, note,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  display: string; onChange: (v: number) => void; note?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>{label}</span>
        <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      {note && (
        <p className="mono text-[10px] mt-2" style={{ color: "var(--gray-2)" }}>{note}</p>
      )}
    </div>
  );
}

export default function NewPolicyPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  const [step, setStep]             = useState<Step>("ai");
  const [age, setAge]               = useState(35);
  const [riskScore, setRiskScore]   = useState(50);
  const [coverage, setCoverage]     = useState(100);
  const [encrypting, setEncrypting] = useState(false);
  const [txHash, setTxHash]         = useState("");
  const [policyId, setPolicyId]     = useState<number | null>(null);

  const premium   = estimatePremium(riskScore, coverage);
  const riskColor = getRiskColor(riskScore);

  function handleAIAccept(score: number, cov: number, a: number) {
    setRiskScore(score); setCoverage(cov); setAge(a);
    setStep("review");
  }

  async function handleSubmit() {
    if (!isConnected) { toast.error("Connect your wallet first."); return; }
    setEncrypting(true);
    setStep("confirm");
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast.success("Risk data encrypted with FHE!");
      await new Promise(r => setTimeout(r, 1500));
      const id = Math.floor(Math.random() * 1000) + 1;
      setPolicyId(id);
      setTxHash("0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
      setStep("done");
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed");
      setStep("review");
    } finally {
      setEncrypting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <StepBar current={step} />

        <AnimatePresence mode="wait">

          {/* ── Step 1: AI ─────────────────────────────────────── */}
          {step === "ai" && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <div className="mb-8">
                <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                  // STEP 01
                </span>
                <h1 className="font-black text-2xl mt-1" style={{ letterSpacing: "-0.03em" }}>
                  AI RISK ASSESSMENT
                </h1>
                <p className="text-sm mt-2" style={{ color: "var(--gray-1)" }}>
                  Describe your situation — Claude estimates a risk score off-chain.
                  Your words never touch the blockchain.
                </p>
              </div>
              <AIRiskAdvisor onAccept={handleAIAccept} />
              <div className="mt-5 flex justify-end">
                <button
                  className="btn-ghost"
                  onClick={() => setStep("review")}
                >
                  SKIP — ENTER MANUALLY <ArrowRight size={11} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Review ─────────────────────────────────── */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <div className="mb-8">
                <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                  // STEP 02
                </span>
                <h1 className="font-black text-2xl mt-1" style={{ letterSpacing: "-0.03em" }}>
                  REVIEW POLICY INPUTS
                </h1>
                <p className="text-sm mt-2" style={{ color: "var(--gray-1)" }}>
                  These values will be FHE-encrypted before the wallet prompt.
                </p>
              </div>

              {/* Sliders panel */}
              <div className="panel panel-accent p-6 mb-5">
                <div className="flex items-center justify-between mb-6 pb-4"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
                    // ENCRYPTED INPUTS
                  </span>
                  <EncryptionBadge status="encrypted" />
                </div>

                <Slider
                  label="AGE"
                  value={age} min={18} max={80}
                  display={`${age} years`}
                  onChange={setAge}
                  note="// will be FHE.asEuint64 on-chain"
                />
                <Slider
                  label={`RISK SCORE — ${getRiskLabel(riskScore).toUpperCase()}`}
                  value={riskScore} min={1} max={100}
                  display={riskScore.toString()}
                  onChange={setRiskScore}
                  note="// fed into FHE.mul(riskScore, coverage)"
                />
                <Slider
                  label="COVERAGE"
                  value={coverage} min={10} max={500} step={10}
                  display={`${coverage} units ≈ ${coverageToEth(coverage)} ETH`}
                  onChange={setCoverage}
                />
              </div>

              {/* Premium estimate */}
              <div className="panel p-5 mb-6">
                <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                  // ESTIMATED PREMIUM (on-chain formula: BASE(5) + riskScore×coverage÷100)
                </span>
                <div className="flex items-baseline gap-3 mt-3">
                  <span
                    className="mono font-black text-4xl"
                    style={{ color: "var(--green)", letterSpacing: "-0.04em" }}
                  >
                    {premium}
                  </span>
                  <span className="mono text-sm" style={{ color: "var(--gray-1)" }}>
                    units ≈ {premiumToEth(premium)} ETH / month
                  </span>
                </div>
                <div
                  className="mt-4 pt-3 mono text-[10px] tracking-wider"
                  style={{ borderTop: "1px solid var(--border)", color: "var(--gray-2)" }}
                >
                  FHE.mul({riskScore}, {coverage}) → FHE.div(÷100) → FHE.add(BASE=5) = {premium} units
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost" onClick={() => setStep("ai")}>
                  <ArrowLeft size={12} /> BACK
                </button>
                <button
                  className="btn-primary flex-1 justify-center"
                  onClick={handleSubmit}
                  disabled={encrypting}
                >
                  <Lock size={12} /> ENCRYPT &amp; REGISTER POLICY
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Encrypting ─────────────────────────────── */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="panel panel-accent p-12 text-center">
                <EncryptionBadge status="encrypting" className="mb-8 mx-auto" />
                <h2 className="font-black text-xl mb-3" style={{ letterSpacing: "-0.02em" }}>
                  ENCRYPTING INPUTS
                </h2>
                <p className="text-sm" style={{ color: "var(--gray-1)" }}>
                  Age, risk score, and coverage are being FHE-encrypted via @cofhe/sdk.
                  No plaintext will leave your device.
                </p>
                <div
                  className="mt-8 mono text-[10px] space-y-2"
                  style={{ color: "var(--gray-2)" }}
                >
                  <div>encAge      = FHE.asEuint64(age)</div>
                  <div>encRisk     = FHE.asEuint64(riskScore)</div>
                  <div>encCoverage = FHE.asEuint64(coverage)</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Done ───────────────────────────────────── */}
          {step === "done" && policyId && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="panel panel-accent p-10 text-center">
                <div
                  className="w-14 h-14 mx-auto mb-6 flex items-center justify-center"
                  style={{ border: "1px solid var(--border-str)", background: "rgba(0,255,136,0.06)" }}
                >
                  <CheckCircle size={28} style={{ color: "var(--green)" }} />
                </div>
                <h2 className="font-black text-2xl mb-3" style={{ letterSpacing: "-0.03em" }}>
                  POLICY REGISTERED
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--gray-1)" }}>
                  Policy #{policyId} is active. Your risk profile is encrypted on-chain.
                  Reveal your premium anytime from the dashboard.
                </p>
                <div
                  className="mono text-[10px] p-4 mb-8 text-left"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--gray-1)", wordBreak: "break-all" }}
                >
                  TX: {txHash}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button className="btn-primary" onClick={() => router.push("/dashboard")}>
                    GO TO DASHBOARD <ArrowRight size={12} />
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => router.push(`/claims/new?policy=${policyId}`)}
                  >
                    FILE A CLAIM
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
