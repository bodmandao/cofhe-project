"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield, Lock, Zap, Eye, ChevronRight,
  ShieldCheck, Coins, Users, Brain,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import PoolStats from "@/components/PoolStats";

const features = [
  {
    icon: <Lock size={20} className="text-cyan-400" />,
    title: "FHE-Encrypted Risk Profiles",
    desc: "Your age, health factors, and risk score are encrypted client-side before submission. The smart contract computes your premium without ever seeing your data.",
    glow: "cyan" as const,
  },
  {
    icon: <Brain size={20} className="text-violet-400" />,
    title: "Claude AI Risk Advisor",
    desc: "Describe your situation in plain English. Claude estimates your risk score off-chain — the numbers are only encrypted once you confirm and submit.",
    glow: "purple" as const,
  },
  {
    icon: <Zap size={20} className="text-amber-400" />,
    title: "FHE Claim Validation",
    desc: "Claims are validated entirely on encrypted ciphertext using FHE.lte, FHE.gte, and FHE.and operations. Payout tier selected by FHE.select — no human in the loop.",
    glow: "none" as const,
  },
  {
    icon: <Eye size={20} className="text-green-400" />,
    title: "Selective Disclosure",
    desc: "You control what's revealed. Use the 3-step CoFHE decrypt flow to reveal your encrypted premium to yourself — no one else can see it.",
    glow: "green" as const,
  },
];

const fheOps = [
  { op: "FHE.mul",    desc: "Risk component",   color: "#7c3aed" },
  { op: "FHE.div",    desc: "Normalise",         color: "#7c3aed" },
  { op: "FHE.add",    desc: "Premium total",     color: "#00e5ff" },
  { op: "FHE.lte",    desc: "Claim ≤ coverage",  color: "#00e5ff" },
  { op: "FHE.gte",    desc: "Severity check",    color: "#00e5ff" },
  { op: "FHE.and",    desc: "Validity gate",     color: "#10b981" },
  { op: "FHE.select", desc: "Payout tier",       color: "#10b981" },
];

const steps = [
  { n: "01", title: "Describe your risk", desc: "Chat with Claude AI to get a risk score estimate. Everything stays off-chain." },
  { n: "02", title: "Encrypt & register",  desc: "Your age, risk score, and coverage are encrypted in-browser via @cofhe/sdk before the wallet prompt." },
  { n: "03", title: "FHE computes premium", desc: "The contract multiplies, divides, and adds on ciphertexts. No plaintext involved." },
  { n: "04", title: "File encrypted claims", desc: "Claim amounts and incident severity are FHE-validated. Payout tier selected by FHE.select." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-cyan-500/20 text-xs text-cyan-400 mb-8">
              <Shield size={12} />
              Built on Fhenix CoFHE — Fully Homomorphic Encryption
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Insurance that{" "}
              <span className="gradient-text">never sees</span>
              <br />your risk profile
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
              ShieldFi computes premiums, validates claims, and issues payouts —
              entirely on encrypted data. Your age, health factors, and coverage
              are FHE-encrypted before they ever touch the blockchain.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/policy/new">
                <GlassButton size="lg" icon={<ShieldCheck size={18} />}>
                  Get Insured
                  <ChevronRight size={16} />
                </GlassButton>
              </Link>
              <Link href="/dashboard">
                <GlassButton size="lg" variant="secondary" icon={<Coins size={16} />}>
                  View Dashboard
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FHE operations strip */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass border border-white/8 rounded-2xl p-5"
          >
            <p className="text-xs text-slate-500 mb-4 text-center">
              7 distinct FHE operations — premium computation, claim validation &amp; payout selection
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {fheOps.map(({ op, desc, color }, i) => (
                <motion.div
                  key={op}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5"
                >
                  <span className="font-mono text-xs font-bold" style={{ color }}>{op}</span>
                  <span className="text-xs text-slate-500">{desc}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-white text-center mb-3"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Privacy-first by design
          </motion.h2>
          <p className="text-slate-400 text-center mb-12 max-w-lg mx-auto">
            Everything a traditional insurer needs to know — none of it ever exposed on-chain.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <GlassCard key={f.title} className="p-6" animate glow={f.glow}>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-5 rounded-xl"
              >
                <div className="text-3xl font-bold gradient-text mb-3">{s.n}</div>
                <h3 className="font-semibold text-white text-sm mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Live Protocol Stats</h2>
          <PoolStats />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 text-center">
        <GlassCard className="max-w-2xl mx-auto p-10 text-center" animate glow="purple">
          <h2 className="text-3xl font-bold text-white mb-4">
            Get insured — <span className="gradient-text">privately</span>
          </h2>
          <p className="text-slate-400 mb-8">
            Powered by Fhenix CoFHE. Your risk stays yours.
          </p>
          <Link href="/policy/new">
            <GlassButton size="lg" icon={<Shield size={18} />} className="mx-auto">
              Start with AI Risk Assessment
              <ChevronRight size={16} />
            </GlassButton>
          </Link>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-white/8 text-center">
        <p className="text-xs text-slate-600">
          ShieldFi — Confidential Insurance Protocol · Built on Fhenix CoFHE ·
          Powered by{" "}
          <span className="text-violet-500">@cofhe/sdk</span> ·{" "}
          <span className="text-cyan-600">Claude AI</span>
        </p>
      </footer>
    </div>
  );
}
