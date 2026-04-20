"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Lock, CheckCircle, AlertTriangle,
  Zap, ChevronLeft, Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import { Toaster, toast } from "sonner";
import { MIN_SEVERITY, TIER_MID, coverageToEth } from "@/utils/constants";

type Step = "form" | "encrypting" | "done";

export default function NewClaimPage() {
  const { isConnected } = useAccount();
  const router          = useRouter();
  const params          = useSearchParams();
  const policyId        = params.get("policy") ?? "";

  const [step, setStep]         = useState<Step>("form");
  const [pid, setPid]           = useState(policyId);
  const [amount, setAmount]     = useState(50);
  const [severity, setSeverity] = useState(60);
  const [txHash, setTxHash]     = useState("");
  const [claimId, setClaimId]   = useState<number | null>(null);

  const isHighTier  = severity >= TIER_MID;
  const isMinSev    = severity >= MIN_SEVERITY;
  const payoutPct   = isHighTier ? 100 : 50;
  const payoutUnits = Math.floor((amount * payoutPct) / 100);

  async function handleSubmit() {
    if (!isConnected) { toast.error("Connect wallet first."); return; }
    if (!pid)          { toast.error("Enter a policy ID."); return; }
    setStep("encrypting");
    try {
      // Simulate FHE encryption + tx
      await new Promise(r => setTimeout(r, 2200));
      toast.success("Claim data encrypted with FHE!");
      await new Promise(r => setTimeout(r, 1500));
      const mockClaimId = Math.floor(Math.random() * 500) + 1;
      setClaimId(mockClaimId);
      setTxHash("0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
      setStep("done");
      toast.success("Claim filed on-chain!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
      setStep("form");
    }
  }

  const severityColor = severity >= TIER_MID ? "#10b981" : severity >= MIN_SEVERITY ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10">
        <AnimatePresence mode="wait">

          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => router.back()} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">File a Claim</h1>
                  <p className="text-slate-400 text-xs">Amount and severity are encrypted before submission</p>
                </div>
              </div>

              {/* Policy ID */}
              <GlassCard className="p-5 mb-5">
                <label className="text-xs text-slate-400 block mb-2">Policy ID</label>
                <input
                  value={pid}
                  onChange={e => setPid(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 outline-none focus:border-cyan-500/40 transition-colors font-mono"
                />
              </GlassCard>

              {/* Encrypted Inputs */}
              <GlassCard className="p-6 mb-5" glow="cyan">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-medium text-slate-300">Encrypted Claim Inputs</h2>
                  <EncryptionBadge status="encrypted" />
                </div>

                {/* Claim amount */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400">Claim Amount</label>
                    <div className="text-right">
                      <span className="text-white font-mono text-sm font-bold">{amount}</span>
                      <span className="text-slate-500 text-xs ml-1">units ≈ {coverageToEth(amount)} ETH</span>
                    </div>
                  </div>
                  <input type="range" min={1} max={500} value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full" />
                  <p className="text-xs text-slate-600 mt-1">Will be FHE-validated: amount ≤ your encrypted coverage</p>
                </div>

                {/* Incident severity */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400">Incident Severity</label>
                    <span className="font-mono text-sm font-bold" style={{ color: severityColor }}>{severity}/100</span>
                  </div>
                  <input type="range" min={0} max={100} value={severity} onChange={e => setSeverity(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-600">Minor</span>
                    <span className="text-slate-600">Severe</span>
                  </div>
                </div>
              </GlassCard>

              {/* FHE validation preview */}
              <GlassCard className="p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-violet-400" />
                  <h3 className="text-xs font-semibold text-white">FHE Validation Preview</h3>
                  <span className="text-xs text-slate-600">(computed on ciphertexts)</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">FHE.lte(claimAmount, coverage)</span>
                    <span className="text-slate-500">≤ your encrypted coverage</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">FHE.gte(severity, {MIN_SEVERITY})</span>
                    <span className={severity >= MIN_SEVERITY ? "text-green-400" : "text-red-400"}>
                      {severity >= MIN_SEVERITY ? "✓ passes" : "✗ fails (severity too low)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">FHE.and(amountValid, severityValid)</span>
                    <span className={isMinSev ? "text-green-400" : "text-red-400"}>
                      {isMinSev ? "✓ claim valid" : "✗ claim invalid"}
                    </span>
                  </div>
                  <div className="border-t border-white/8 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">FHE.select(severity ≥ {TIER_MID}, full, half)</span>
                    <span className="text-white font-medium">
                      {payoutPct}% → {payoutUnits} units
                    </span>
                  </div>
                </div>
              </GlassCard>

              {!isMinSev && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    Severity below {MIN_SEVERITY} — the FHE.and validation will mark this claim invalid.
                    Increase severity or this claim will be rejected on-chain.
                  </p>
                </div>
              )}

              <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-3 mb-5">
                <div className="flex items-start gap-2">
                  <Info size={13} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    Your claim amount and incident severity are encrypted client-side.
                    The smart contract validates them using FHE operations — the actual values are never visible on-chain.
                  </p>
                </div>
              </div>

              <GlassButton
                onClick={handleSubmit}
                icon={<Lock size={14} />}
                className="w-full justify-center"
                disabled={!isMinSev || !pid}
              >
                Encrypt &amp; File Claim
              </GlassButton>
            </motion.div>
          )}

          {step === "encrypting" && (
            <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlassCard className="p-10 text-center" glow="cyan">
                <EncryptionBadge status="encrypting" className="mb-6 mx-auto" />
                <h2 className="text-xl font-bold text-white mb-3">Encrypting claim data…</h2>
                <p className="text-slate-400 text-sm">
                  Claim amount and severity are being FHE-encrypted.
                  The FHE coprocessor will validate them without decryption.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {step === "done" && claimId && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-8 text-center" glow="green">
                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Claim Filed!</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Claim #{claimId} is pending FHE validation. The CoFHE coprocessor will evaluate
                  your encrypted claim and return a validity result.
                </p>
                <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs text-slate-500 mb-1">Transaction</p>
                  <p className="font-mono text-xs text-slate-300 break-all">{txHash}</p>
                </div>
                <GlassButton onClick={() => router.push("/dashboard")} icon={<FileText size={14} />} className="mx-auto">
                  Back to Dashboard
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
