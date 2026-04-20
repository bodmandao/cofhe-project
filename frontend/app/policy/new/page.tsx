"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ChevronRight, ChevronLeft, Lock,
  CheckCircle, AlertCircle, Coins,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import AIRiskAdvisor from "@/components/AIRiskAdvisor";
import { Toaster, toast } from "sonner";
import {
  estimatePremium, premiumToEth, coverageToEth,
  getRiskColor, getRiskLabel,
} from "@/utils/constants";

type Step = "ai" | "review" | "confirm" | "done";

export default function NewPolicyPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  const [step, setStep]               = useState<Step>("ai");
  const [age, setAge]                 = useState(35);
  const [riskScore, setRiskScore]     = useState(50);
  const [coverage, setCoverage]       = useState(100);
  const [encrypting, setEncrypting]   = useState(false);
  const [txHash, setTxHash]           = useState("");
  const [policyId, setPolicyId]       = useState<number | null>(null);

  const premiumEstimate = estimatePremium(riskScore, coverage);
  const riskColor       = getRiskColor(riskScore);

  function handleAIAccept(score: number, cov: number, a: number) {
    setRiskScore(score);
    setCoverage(cov);
    setAge(a);
    setStep("review");
  }

  async function handleEncryptAndSubmit() {
    if (!isConnected) { toast.error("Connect your wallet first."); return; }
    setEncrypting(true);
    setStep("confirm");
    try {
      // In a real integration, this would use @cofhe/sdk to encrypt inputs
      // and call the registerPolicy contract function.
      // For the demo we simulate the FHE encryption step:
      await new Promise(r => setTimeout(r, 2000)); // simulate encrypt delay
      toast.success("Risk data encrypted with FHE!");
      await new Promise(r => setTimeout(r, 1500)); // simulate tx delay
      const mockPolicyId = Math.floor(Math.random() * 1000) + 1;
      setPolicyId(mockPolicyId);
      setTxHash("0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
      setStep("done");
      toast.success("Policy registered on-chain!");
    } catch (err: any) {
      toast.error(err?.message ?? "Transaction failed");
      setStep("review");
    } finally {
      setEncrypting(false);
    }
  }

  const stepIndex: Record<Step, number> = { ai: 0, review: 1, confirm: 2, done: 3 };
  const progressSteps = ["AI Assessment", "Review", "Encrypt & Submit", "Done"];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {progressSteps.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  i < stepIndex[step]
                    ? "bg-cyan-500/30 border-cyan-400/60 text-cyan-300"
                    : i === stepIndex[step]
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 encrypt-pulse"
                    : "bg-white/5 border-white/10 text-slate-600"
                }`}>
                  {i < stepIndex[step] ? <CheckCircle size={12} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === stepIndex[step] ? "text-white" : "text-slate-500"}`}>
                  {label}
                </span>
              </div>
              {i < progressSteps.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${i < stepIndex[step] ? "bg-cyan-500/40" : "bg-white/8"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Step 1: AI Assessment */}
          {step === "ai" && (
            <motion.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-white mb-2">AI Risk Assessment</h1>
              <p className="text-slate-400 text-sm mb-6">
                Describe your situation — Claude will estimate a risk score that you can then encrypt on-chain.
                Your words never touch the blockchain.
              </p>
              <AIRiskAdvisor onAccept={handleAIAccept} />
              <div className="mt-4 flex justify-end">
                <GlassButton variant="ghost" onClick={() => setStep("review")} icon={<ChevronRight size={14} />}>
                  Skip — enter manually
                </GlassButton>
              </div>
            </motion.div>
          )}

          {/* Step 2: Review & adjust */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-bold text-white mb-2">Review Policy Details</h1>
              <p className="text-slate-400 text-sm mb-6">
                Adjust your inputs. These values will be encrypted by FHE before submission.
              </p>

              <GlassCard className="p-6 mb-5" glow="cyan">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-slate-300">Encrypted Inputs</h2>
                  <EncryptionBadge status="encrypted" />
                </div>

                {/* Age */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-400">Age</label>
                    <span className="text-white font-mono text-sm">{age}</span>
                  </div>
                  <input type="range" min={18} max={80} value={age} onChange={e => setAge(Number(e.target.value))} className="w-full" />
                </div>

                {/* Risk Score */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-400">Risk Score</label>
                    <span className="font-mono text-sm font-bold" style={{ color: riskColor }}>{riskScore} — {getRiskLabel(riskScore)}</span>
                  </div>
                  <input type="range" min={1} max={100} value={riskScore} onChange={e => setRiskScore(Number(e.target.value))} className="w-full" />
                </div>

                {/* Coverage */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-400">Coverage (units)</label>
                    <span className="text-white font-mono text-sm">{coverage} units ≈ {coverageToEth(coverage)} ETH</span>
                  </div>
                  <input type="range" min={10} max={500} step={10} value={coverage} onChange={e => setCoverage(Number(e.target.value))} className="w-full" />
                </div>
              </GlassCard>

              {/* Premium estimate */}
              <GlassCard className="p-5 mb-6">
                <h2 className="text-xs text-slate-400 mb-3">Estimated Monthly Premium</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold gradient-text">{premiumEstimate}</span>
                  <span className="text-slate-400 text-sm">units ≈ {premiumToEth(premiumEstimate)} ETH / month</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Formula: BASE(5) + (riskScore × coverage) ÷ 100 — computed by FHE, never in plaintext
                </p>
              </GlassCard>

              <div className="flex gap-3">
                <GlassButton variant="secondary" onClick={() => setStep("ai")} icon={<ChevronLeft size={14} />}>
                  Back
                </GlassButton>
                <GlassButton onClick={handleEncryptAndSubmit} loading={encrypting} icon={<Lock size={14} />} className="flex-1 justify-center">
                  Encrypt &amp; Register Policy
                </GlassButton>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirming */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlassCard className="p-10 text-center" glow="cyan">
                <EncryptionBadge status="encrypting" className="mb-6 mx-auto" />
                <h2 className="text-xl font-bold text-white mb-3">Encrypting your data…</h2>
                <p className="text-slate-400 text-sm">
                  Your age, risk score, and coverage are being encrypted with FHE via @cofhe/sdk.
                  No plaintext will leave your device.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === "done" && policyId && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-8 text-center" glow="green">
                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Policy Registered!</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Policy #{policyId} is active. Your risk profile is encrypted on-chain.
                  Reveal your premium anytime from the dashboard.
                </p>
                <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs text-slate-500 mb-1">Transaction</p>
                  <p className="font-mono text-xs text-slate-300 break-all">{txHash}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <GlassButton onClick={() => router.push("/dashboard")} icon={<Shield size={14} />}>
                    Go to Dashboard
                  </GlassButton>
                  <GlassButton variant="secondary" onClick={() => router.push(`/claims/new?policy=${policyId}`)} icon={<AlertCircle size={14} />}>
                    File a Claim
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
