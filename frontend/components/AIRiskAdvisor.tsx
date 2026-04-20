"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, ShieldAlert, TrendingUp, Coins, Lock } from "lucide-react";
import GlassCard from "./ui/GlassCard";
import GlassButton from "./ui/GlassButton";
import EncryptionBadge from "./ui/EncryptionBadge";
import type { RiskAssessmentResult } from "@/app/api/risk-assess/route";
import { getRiskColor, estimatePremium, premiumToEth, coverageToEth } from "@/utils/constants";

interface Props {
  onAccept?: (riskScore: number, coverage: number, age: number) => void;
}

export default function AIRiskAdvisor({ onAccept }: Props) {
  const [description, setDescription] = useState("");
  const [age, setAge]                 = useState(35);
  const [result, setResult]           = useState<RiskAssessmentResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  async function assess() {
    if (description.trim().length < 10) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/risk-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json() as RiskAssessmentResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Assessment failed"); return; }
      setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const riskColor = result ? getRiskColor(result.riskScore) : "#94a3b8";

  return (
    <GlassCard className="p-6" animate>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Sparkles size={15} className="text-violet-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AI Risk Advisor</h3>
          <p className="text-xs text-slate-500">Powered by Claude — your words never touch the chain</p>
        </div>
        <EncryptionBadge status="encrypted" className="ml-auto" />
      </div>

      {/* Age input */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 block mb-1.5">Your age</label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={18} max={80} value={age}
            onChange={e => setAge(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-white font-mono w-8 text-center text-sm">{age}</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">This will be encrypted — even we won't see it.</p>
      </div>

      {/* Situation description */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 block mb-1.5">
          Describe your situation
          <span className="text-slate-600 ml-2">(occupation, health, lifestyle — stays off-chain)</span>
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. I'm a 35-year-old software engineer, generally healthy, no chronic conditions. I do weekend rock climbing and have a family with two kids…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-none focus:border-cyan-500/40 transition-colors outline-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-600">{description.length}/1500</span>
          {description.length >= 10 && (
            <span className="text-xs text-cyan-600 flex items-center gap-1">
              <Lock size={10} /> Off-chain only — not submitted to blockchain
            </span>
          )}
        </div>
      </div>

      <GlassButton
        onClick={assess}
        loading={loading}
        disabled={description.trim().length < 10}
        icon={<Send size={14} />}
        className="w-full justify-center"
      >
        {loading ? "Analysing with Claude…" : "Get Risk Assessment"}
      </GlassButton>

      {error && (
        <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 border-t border-white/8 pt-5"
          >
            {/* Risk score dial */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={riskColor} strokeWidth="8"
                    strokeDasharray={`${(result.riskScore / 100) * 201} 201`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${riskColor}80)` }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                  {result.riskScore}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Risk Score</p>
                <p className="text-lg font-bold" style={{ color: riskColor }}>{result.tier} Risk</p>
                <p className="text-xs text-slate-500 mt-0.5">out of 100</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/8">
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                  <ShieldAlert size={11} /> Recommended Coverage
                </div>
                <p className="text-white font-semibold">{result.recommendedCoverage} units</p>
                <p className="text-xs text-slate-500">≈ {coverageToEth(result.recommendedCoverage)} ETH</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/8">
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                  <Coins size={11} /> Est. Monthly Premium
                </div>
                <p className="text-white font-semibold">{result.premiumEstimate} units</p>
                <p className="text-xs text-slate-500">≈ {premiumToEth(result.premiumEstimate)} ETH</p>
              </div>
            </div>

            {/* Reasoning */}
            <p className="text-sm text-slate-300 mb-3">{result.reasoning}</p>

            {/* Risk factors */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {result.factors.map(f => (
                <span key={f} className="text-xs bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                  {f}
                </span>
              ))}
            </div>

            <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-3 mb-4">
              <p className="text-xs text-cyan-400 flex items-center gap-1 mb-0.5">
                <Lock size={10} /> Privacy guarantee
              </p>
              <p className="text-xs text-slate-400">
                These numbers will be encrypted client-side using FHE before reaching the blockchain.
                Your risk score, age, and coverage are never exposed — not even to the smart contract.
              </p>
            </div>

            {onAccept && (
              <GlassButton
                onClick={() => onAccept(result.riskScore, result.recommendedCoverage, age)}
                icon={<TrendingUp size={14} />}
                className="w-full justify-center"
              >
                Use these values &rarr; encrypt &amp; register policy
              </GlassButton>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
