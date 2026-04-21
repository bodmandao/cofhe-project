"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import PoolStats from "@/components/PoolStats";

/* ── FHE ops data ─────────────────────────────────────────────── */
const OPS = [
  { op: "FHE.mul",    desc: "riskScore × coverage",           cls: "op-mul" },
  { op: "FHE.div",    desc: "÷ RISK_DENOMINATOR(100)",        cls: "op-div" },
  { op: "FHE.add",    desc: "BASE_PREMIUM + riskComponent",   cls: "op-add" },
  { op: "FHE.lte",    desc: "claimAmount ≤ encCoverage",      cls: "op-lte" },
  { op: "FHE.gte",    desc: "severity ≥ MIN_SEVERITY(30)",    cls: "op-gte" },
  { op: "FHE.and",    desc: "amountValid ∧ severityValid",    cls: "op-and" },
  { op: "FHE.select", desc: "severity≥70 → full | else → ½", cls: "op-select" },
];

const PRIVACY = [
  { field: "Age",             vis: "ENCRYPTED",    note: "only policy holder" },
  { field: "Risk Score",      vis: "ENCRYPTED",    note: "only policy holder" },
  { field: "Coverage",        vis: "ENCRYPTED",    note: "only policy holder" },
  { field: "Premium",         vis: "FHE-COMPUTED", note: "holder reveals on-demand" },
  { field: "Claim Amount",    vis: "ENCRYPTED",    note: "never revealed except at payout" },
  { field: "Claim Severity",  vis: "ENCRYPTED",    note: "never revealed" },
  { field: "Pool Balance",    vis: "PUBLIC",       note: "aggregate only" },
  { field: "Total Policies",  vis: "PUBLIC",       note: "aggregate only" },
];

/* ── FHE Terminal component ───────────────────────────────────── */
const TERM_STEPS = [
  {
    comment: "// encrypted inputs — plaintext never enters contract",
    lines: [
      { text: "encAge      = ", enc: "0x8f3a2b…e91c" },
      { text: "encRisk     = ", enc: "0xc7f04d…3a18" },
      { text: "encCoverage = ", enc: "0x2e9b51…f76a" },
    ],
  },
  {
    comment: "// FHE.mul — riskScore × coverage (on ciphertexts)",
    lines: [{ text: "product     = FHE.mul(encRisk, encCoverage)", enc: null, op: "op-mul" }],
  },
  {
    comment: "// FHE.div — normalise by RISK_DENOMINATOR = 100",
    lines: [{ text: "riskComp    = FHE.div(product, denom)", enc: null, op: "op-div" }],
  },
  {
    comment: "// FHE.add — total premium",
    lines: [{ text: "premium     = FHE.add(BASE_5, riskComp)", enc: null, op: "op-add" }],
  },
  {
    comment: "// result — still encrypted on-chain",
    lines: [{ text: "encPremium  = ", enc: "0x9d1c3e…b52f  ✓ stored" }],
  },
];

function FHETerminal() {
  return (
    <div className="terminal w-full max-w-[420px]">
      <div className="terminal-bar justify-between">
        <div className="flex items-center gap-2">
          <div className="terminal-dot" style={{ background: "#f43f5e" }} />
          <div className="terminal-dot" style={{ background: "#f59e0b" }} />
          <div className="terminal-dot" style={{ background: "var(--green)" }} />
          <span className="mono text-[10px] ml-2 tracking-wider" style={{ color: "var(--gray-1)" }}>
            premium_computation.fhe
          </span>
        </div>
        <span className="mono text-[9px]" style={{ color: "var(--green)" }}>● LIVE</span>
      </div>

      <div className="p-5 space-y-5">
        {TERM_STEPS.map((block, bi) => (
          <motion.div
            key={bi}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + bi * 0.35, duration: 0.4 }}
          >
            <div className="mono text-[10px] mb-2" style={{ color: "var(--gray-2)" }}>
              {block.comment}
            </div>
            {block.lines.map((line, li) => (
              <div key={li} className={`mono text-[11px] leading-6 ${(line as any).op ?? ""}`}>
                {line.enc === null ? (
                  <span>{line.text}</span>
                ) : (
                  <>
                    <span style={{ color: "var(--gray-1)" }}>{line.text}</span>
                    <span
                      className="enc-shimmer mono text-[10px] px-1.5 py-0.5"
                      style={{ color: "var(--gray-1)" }}
                    >
                      {line.enc}
                    </span>
                  </>
                )}
              </div>
            ))}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3 }}
          className="pt-4 flex items-center gap-2 mono text-[10px] tracking-wider"
          style={{ borderTop: "1px solid rgba(0,255,136,0.1)", color: "var(--green)" }}
        >
          <div className="status-dot" style={{ width: 5, height: 5 }} />
          COMPUTATION COMPLETE · NO PLAINTEXT EXPOSED
        </motion.div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="grid-bg relative min-h-[calc(100vh-52px)] flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 py-16 grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="inline-flex items-center gap-2 mono text-[10px] tracking-widest mb-8 px-3 py-1.5"
                style={{
                  border: "1px solid rgba(0,255,136,0.2)",
                  background: "rgba(0,255,136,0.05)",
                  color: "var(--green)",
                }}
              >
                <div className="status-dot" style={{ width: 5, height: 5 }} />
                FHENIX COFHE · FULLY HOMOMORPHIC ENCRYPTION
              </div>

              <h1
                className="font-black leading-none mb-4"
                style={{
                  fontSize: "clamp(2.6rem, 6.5vw, 5rem)",
                  letterSpacing: "-0.035em",
                  color: "var(--white)",
                }}
              >
                ENCRYPTED<br />
                <span style={{ color: "var(--green)", WebkitTextStroke: "0px" }}>
                  INSURANCE
                </span>
                <br />PROTOCOL
              </h1>

              <div className="w-14 h-px my-6" style={{ background: "var(--green)" }} />

              <p className="text-base leading-relaxed max-w-md mb-10" style={{ color: "var(--gray-1)" }}>
                Risk profiles, premiums, and claims computed entirely on FHE ciphertexts.
                No plaintext ever enters the contract.{" "}
                <span style={{ color: "var(--white)" }}>Powered by Fhenix CoFHE.</span>
              </p>

              <div className="flex flex-wrap gap-3 mb-12">
                <Link href="/policy/new">
                  <button className="btn-primary">
                    GET INSURED <ArrowRight size={13} />
                  </button>
                </Link>
                <Link href="/dashboard">
                  <button className="btn-outline">VIEW DASHBOARD</button>
                </Link>
              </div>

              {/* Quick stats strip */}
              <div
                className="grid grid-cols-3 gap-px"
                style={{ border: "1px solid var(--border)", overflow: "hidden" }}
              >
                {[
                  { n: "7",    label: "FHE OPERATIONS" },
                  { n: "3",    label: "DECRYPT STEPS" },
                  { n: "100%", label: "PRIVATE INPUTS" },
                ].map(({ n, label }) => (
                  <div
                    key={label}
                    className="px-4 py-3 text-center"
                    style={{ background: "var(--surface)" }}
                  >
                    <div className="mono font-bold text-xl mb-0.5" style={{ color: "var(--green)" }}>
                      {n}
                    </div>
                    <div className="mono text-[9px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: terminal */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FHETerminal />
          </motion.div>
        </div>
      </section>

      {/* ── FHE Ops Ticker ────────────────────────────────────── */}
      <div
        className="overflow-hidden py-3"
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,255,136,0.02)",
        }}
      >
        <div className="flex gap-10 ticker-scroll whitespace-nowrap">
          {[...OPS, ...OPS, ...OPS].map(({ op, desc, cls }, i) => (
            <span key={i} className="inline-flex items-center gap-2 mono text-[11px] shrink-0">
              <span className={`font-bold ${cls}`}>{op}</span>
              <span style={{ color: "var(--gray-2)" }}>// {desc}</span>
              <span style={{ color: "var(--gray-3)" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
              // PROTOCOL ARCHITECTURE
            </span>
            <h2
              className="text-3xl font-black mt-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              Privacy by construction
            </h2>
          </div>

          <div
            className="grid md:grid-cols-3 gap-px"
            style={{ background: "var(--border)", overflow: "hidden" }}
          >
            {[
              {
                num: "01",
                label: "CLIENT-SIDE ENCRYPTION",
                title: "Inputs never leave your device in plaintext",
                desc: "Age, risk score, and coverage are encrypted in-browser via @cofhe/sdk before the wallet prompt. The contract receives ciphertext handles, never values.",
                opCls: "op-mul",
                op: "FHE.asEuint64",
              },
              {
                num: "02",
                label: "ON-CHAIN FHE COMPUTATION",
                title: "Arithmetic on encrypted ciphertexts",
                desc: "Premium = BASE(5) + (riskScore × coverage) ÷ 100. Computed as FHE.mul → FHE.div → FHE.add on ciphertexts. Claims validated via FHE.lte + FHE.gte + FHE.and.",
                opCls: "op-add",
                op: "FHE.mul / FHE.add",
              },
              {
                num: "03",
                label: "SELECTIVE REVEAL",
                title: "You control what gets decrypted",
                desc: "3-step CoFHE flow: requestReveal → threshold network signs → publishDecryptResult. Only the holder triggers reveal. Payout disclosed only at withdrawal.",
                opCls: "op-select",
                op: "FHE.select",
              },
            ].map((f) => (
              <div key={f.num} className="p-8" style={{ background: "var(--bg)" }}>
                <div className="flex items-start justify-between mb-6">
                  <span className="mono text-[10px] tracking-widest" style={{ color: "var(--gray-2)" }}>
                    {f.num}
                  </span>
                  <span className={`mono text-[10px] font-bold ${f.opCls}`}>{f.op}</span>
                </div>
                <div
                  className="mono text-[9px] tracking-widest mb-3"
                  style={{ color: "var(--green)" }}
                >
                  {f.label}
                </div>
                <h3 className="font-bold text-sm mb-3 leading-snug">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--gray-1)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy Table ─────────────────────────────────────── */}
      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
              // PRIVACY MODEL
            </span>
            <h2
              className="text-3xl font-black mt-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              What the contract sees
            </h2>
            <p className="text-sm mt-3" style={{ color: "var(--gray-1)" }}>
              Every sensitive field is an FHE ciphertext handle on-chain. Only public aggregates are readable.
            </p>
          </div>

          <div className="panel overflow-hidden">
            <div
              className="grid grid-cols-3 gap-4 px-5 py-2.5 mono text-[9px] tracking-widest"
              style={{ borderBottom: "1px solid var(--border)", color: "var(--gray-2)" }}
            >
              <span>FIELD</span><span>VISIBILITY</span><span>SCOPE</span>
            </div>
            {PRIVACY.map((row, i) => (
              <div
                key={row.field}
                className="grid grid-cols-3 gap-4 px-5 py-3 row-hover"
                style={{
                  borderBottom: i < PRIVACY.length - 1 ? "1px solid var(--border)" : "none",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                }}
              >
                <span className="mono text-xs" style={{ color: "var(--white)" }}>{row.field}</span>
                <span
                  className="mono text-[10px] font-bold tracking-wider"
                  style={{
                    color: row.vis === "PUBLIC"
                      ? "var(--amber)"
                      : row.vis === "FHE-COMPUTED"
                      ? "var(--violet)"
                      : "var(--green)",
                  }}
                >
                  {row.vis}
                </span>
                <span className="mono text-[10px]" style={{ color: "var(--gray-1)" }}>{row.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
              // USER FLOW
            </span>
            <h2 className="text-3xl font-black mt-2" style={{ letterSpacing: "-0.03em" }}>
              How it works
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border)", overflow: "hidden" }}>
            {[
              { n: "01", title: "AI risk estimate", desc: "Describe your situation to Claude AI off-chain. Risk score stays local — never touches the chain." },
              { n: "02", title: "Encrypt & register", desc: "Age, risk score, coverage encrypted in-browser via @cofhe/sdk. Contract receives ciphertext handles only." },
              { n: "03", title: "FHE computes premium", desc: "mul → div → add on ciphertexts. Result stored as encrypted handle. No plaintext in any step." },
              { n: "04", title: "File & withdraw", desc: "Claims validated via FHE.lte/gte/and/select. Payout revealed only at withdrawal." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-7"
                style={{ background: "var(--bg)" }}
              >
                <div
                  className="mono font-black text-4xl mb-4"
                  style={{ color: "var(--green)", opacity: 0.25 }}
                >
                  {s.n}
                </div>
                <h3 className="font-bold text-sm mb-2">{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--gray-1)" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Stats ────────────────────────────────────────── */}
      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
              // ON-CHAIN STATE
            </span>
            <h2 className="text-3xl font-black mt-2" style={{ letterSpacing: "-0.03em" }}>
              Live protocol stats
            </h2>
          </div>
          <PoolStats />
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="px-6 py-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
              // GET STARTED
            </span>
            <h2
              className="text-4xl font-black mt-3 mb-5 leading-none"
              style={{ letterSpacing: "-0.035em" }}
            >
              INSURE YOUR RISK.<br />
              <span style={{ color: "var(--green)" }}>KEEP YOUR DATA.</span>
            </h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--gray-1)" }}>
              AI-powered risk estimate off-chain, encrypted inputs on-chain, FHE-validated claims —
              all in one seamless flow.
            </p>
            <Link href="/policy/new">
              <button className="btn-primary">
                START AI ASSESSMENT <ArrowRight size={13} />
              </button>
            </Link>
          </div>

          <div
            className="panel p-6 mono text-[11px] space-y-3"
            style={{ color: "var(--gray-1)" }}
          >
            {[
              { step: "01", text: "Claude AI estimates risk score off-chain" },
              { step: "02", text: "Inputs encrypted via @cofhe/sdk before wallet prompt" },
              { step: "03", text: "Premium computed on ciphertexts: FHE.mul → div → add" },
              { step: "04", text: "Claims validated without decryption: FHE.lte + gte + and" },
              { step: "05", text: "Payout tier selected: FHE.select(severity≥70, full, half)" },
              { step: "06", text: "Amount revealed only at withdrawal — not before" },
            ].map(({ step, text }) => (
              <div key={step} className="flex gap-3 items-start">
                <span className="shrink-0" style={{ color: "var(--green)", opacity: 0.5 }}>
                  {step}
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="px-6 py-5 mono text-[10px] tracking-wider"
        style={{ borderTop: "1px solid var(--border)", color: "var(--gray-2)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <span style={{ color: "var(--green)" }}>◈ SHIELDFI</span>
          <span>CONFIDENTIAL INSURANCE PROTOCOL · FHENIX COFHE · CLAUDE AI · ARBITRUM SEPOLIA</span>
          <span>MIT LICENSE</span>
        </div>
      </footer>
    </div>
  );
}
