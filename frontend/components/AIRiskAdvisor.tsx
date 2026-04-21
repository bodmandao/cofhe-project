"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await fetch("/api/risk-assess", {
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

  const riskColor = result ? getRiskColor(result.riskScore) : "var(--gray-1)";

  return (
    <div className="terminal">
      {/* Title bar */}
      <div className="terminal-bar justify-between">
        <div className="flex items-center gap-2">
          <div className="terminal-dot" style={{ background: "#f43f5e" }} />
          <div className="terminal-dot" style={{ background: "#f59e0b" }} />
          <div className="terminal-dot" style={{ background: "var(--green)" }} />
          <span className="mono text-[10px] ml-2 tracking-wider" style={{ color: "var(--gray-1)" }}>
            claude_risk_advisor.ai
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono text-[9px]" style={{ color: "var(--violet)" }}>claude-sonnet-4-6</span>
          <EncryptionBadge status="encrypted" />
        </div>
      </div>

      <div className="p-6">
        {/* Age slider */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
              AGE (encrypted — only you see this)
            </label>
            <span className="mono text-sm font-bold" style={{ color: "var(--white)" }}>{age}</span>
          </div>
          <input
            type="range" min={18} max={80} value={age}
            onChange={e => setAge(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: "var(--gray-2)" }}>
            DESCRIBE YOUR SITUATION{" "}
            <span style={{ color: "var(--gray-3)" }}>// off-chain only, never touches blockchain</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. 35-year-old software engineer, healthy, no chronic conditions. Weekend rock climber, family with two kids…"
            className="w-full mono text-xs px-4 py-3 resize-none outline-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--white)",
              lineHeight: 1.7,
            }}
            onFocus={e => (e.target.style.borderColor = "var(--border-str)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <div className="flex justify-between mt-1.5 mono text-[9px]" style={{ color: "var(--gray-2)" }}>
            <span>{description.length}/1500 chars</span>
            {description.length >= 10 && (
              <span style={{ color: "var(--green)" }}>↳ off-chain · not submitted to blockchain</span>
            )}
          </div>
        </div>

        <button
          className="btn-primary w-full justify-center"
          onClick={assess}
          disabled={loading || description.trim().length < 10}
        >
          {loading ? (
            <>
              <span
                className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full"
                style={{ animation: "spin 0.8s linear infinite" }}
              />
              ANALYSING WITH CLAUDE…
            </>
          ) : (
            "GET RISK ASSESSMENT"
          )}
        </button>

        {error && (
          <div
            className="mono text-[10px] mt-3 p-3"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--red)" }}
          >
            ERROR: {error}
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 pt-6"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              {/* Score + tier */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="30" fill="none"
                      stroke={riskColor} strokeWidth="6"
                      strokeDasharray={`${(result.riskScore / 100) * 188} 188`}
                      strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 5px ${riskColor}80)`, transition: "stroke-dasharray 0.6s ease" }}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center mono font-black text-xl"
                    style={{ color: riskColor }}
                  >
                    {result.riskScore}
                  </span>
                </div>
                <div>
                  <div className="mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gray-2)" }}>
                    CLAUDE RISK ASSESSMENT
                  </div>
                  <div className="mono font-black text-2xl" style={{ color: riskColor, letterSpacing: "-0.03em" }}>
                    {result.tier.toUpperCase()}
                  </div>
                  <div className="mono text-[10px] mt-1" style={{ color: "var(--gray-1)" }}>
                    risk score {result.riskScore}/100
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div
                className="grid grid-cols-2 gap-px mb-6"
                style={{ background: "var(--border)", overflow: "hidden" }}
              >
                {[
                  { label: "REC. COVERAGE", value: `${result.recommendedCoverage} units`, sub: `≈ ${coverageToEth(result.recommendedCoverage)} ETH` },
                  { label: "EST. PREMIUM",  value: `${result.premiumEstimate} units`,     sub: `≈ ${premiumToEth(result.premiumEstimate)} ETH/mo` },
                ].map(s => (
                  <div key={s.label} className="p-4" style={{ background: "rgba(0,255,136,0.03)" }}>
                    <div className="mono text-[9px] tracking-widest mb-1.5" style={{ color: "var(--gray-2)" }}>{s.label}</div>
                    <div className="mono font-bold text-sm" style={{ color: "var(--white)" }}>{s.value}</div>
                    <div className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Reasoning */}
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--gray-1)" }}>{result.reasoning}</p>

              {/* Factors */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {result.factors.map(f => (
                  <span
                    key={f}
                    className="mono text-[9px] tracking-wider px-2 py-0.5"
                    style={{ border: "1px solid var(--border-mid)", color: "var(--gray-1)" }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* Privacy note */}
              <div
                className="mono text-[10px] p-3 mb-5"
                style={{ background: "rgba(0,255,136,0.04)", border: "1px solid var(--border-str)", color: "var(--green)" }}
              >
                → these numbers will be FHE-encrypted client-side before reaching the blockchain
              </div>

              {onAccept && (
                <button
                  className="btn-primary w-full justify-center"
                  onClick={() => onAccept(result.riskScore, result.recommendedCoverage, age)}
                >
                  USE THESE VALUES — ENCRYPT &amp; REGISTER <ArrowRight size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
