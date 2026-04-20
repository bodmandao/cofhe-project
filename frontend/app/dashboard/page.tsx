"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield, FileText, Plus, Lock, ChevronRight,
  TrendingUp, Coins, Clock, CheckCircle, XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import PoolStats from "@/components/PoolStats";
import { useUserPolicies, useUserClaims, usePolicy, useClaim } from "@/hooks/useInsurance";
import {
  POLICY_STATUS_MAP, CLAIM_STATUS_MAP, CLAIM_STATUS_COLOR,
  premiumToEth,
} from "@/utils/constants";

function PolicyRow({ policyId }: { policyId: bigint }) {
  const { data: policy } = usePolicy(policyId);
  const p = policy as any;

  const isActive  = p?.status === 0;
  const isPastDue = p && isActive && Number(p.premiumPaidUntil) < Date.now() / 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass glass-hover rounded-xl p-4 flex items-center gap-4"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isActive ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-white/5 border border-white/10"
      }`}>
        <Shield size={18} className={isActive ? "text-cyan-400" : "text-slate-500"} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">Policy #{policyId.toString()}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            isActive
              ? "text-green-400 border-green-500/30 bg-green-500/10"
              : "text-slate-500 border-white/10 bg-white/5"
          }`}>
            {POLICY_STATUS_MAP[p?.status ?? 0]}
          </span>
          {isPastDue && (
            <span className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Premium due
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <EncryptionBadge status="encrypted" className="scale-90 origin-left" />
          <span className="text-xs text-slate-500">
            {p?.premiumPaidUntil && Number(p.premiumPaidUntil) > 0
              ? `Coverage until ${new Date(Number(p.premiumPaidUntil) * 1000).toLocaleDateString()}`
              : "No active coverage period"}
          </span>
        </div>
      </div>

      <Link href={`/claims/new?policy=${policyId}`}>
        <GlassButton size="sm" variant="secondary" icon={<FileText size={12} />}>
          Claim
        </GlassButton>
      </Link>
    </motion.div>
  );
}

function ClaimRow({ claimId }: { claimId: bigint }) {
  const { data: claim } = useClaim(claimId);
  const c = claim as any;
  const statusColor = CLAIM_STATUS_COLOR[c?.status ?? 0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass glass-hover rounded-xl p-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <FileText size={18} className="text-slate-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">Claim #{claimId.toString()}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{
            color: statusColor,
            borderColor: `${statusColor}40`,
            backgroundColor: `${statusColor}15`,
          }}>
            {CLAIM_STATUS_MAP[c?.status ?? 0]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <EncryptionBadge status="encrypted" className="scale-90 origin-left" />
          <span className="text-xs text-slate-500">
            Filed {c?.filedAt ? new Date(Number(c.filedAt) * 1000).toLocaleDateString() : "–"}
          </span>
        </div>
      </div>

      {c?.status === 1 && (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle size={12} /> Approved
        </span>
      )}
      {c?.status === 2 && (
        <span className="text-xs text-red-400 flex items-center gap-1">
          <XCircle size={12} /> Rejected
        </span>
      )}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { data: policyIds } = useUserPolicies();
  const { data: claimIds }  = useUserClaims();

  const policies = (policyIds as bigint[] | undefined) ?? [];
  const claims   = (claimIds  as bigint[] | undefined) ?? [];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <GlassCard className="p-10 text-center max-w-sm" animate glow="cyan">
            <Lock size={40} className="text-cyan-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-3">Connect your wallet</h2>
            <p className="text-slate-400 text-sm">Connect to view your encrypted policies and claims.</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">{address}</p>
          </div>
          <Link href="/policy/new">
            <GlassButton icon={<Plus size={14} />}>New Policy</GlassButton>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Policies */}
          <div className="lg:col-span-2 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Shield size={16} className="text-cyan-400" />
                  My Policies
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {policies.length}
                  </span>
                </h2>
              </div>
              {policies.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <Shield size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm mb-4">No policies yet</p>
                  <Link href="/policy/new">
                    <GlassButton size="sm" icon={<Plus size={13} />}>Get Insured</GlassButton>
                  </Link>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {policies.map(id => <PolicyRow key={id.toString()} policyId={id} />)}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText size={16} className="text-violet-400" />
                  My Claims
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {claims.length}
                  </span>
                </h2>
              </div>
              {claims.length === 0 ? (
                <GlassCard className="p-6 text-center">
                  <p className="text-slate-500 text-sm">No claims filed</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {claims.map(id => <ClaimRow key={id.toString()} claimId={id} />)}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <PoolStats />

            {/* Privacy note */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={14} className="text-cyan-400" />
                <h3 className="text-xs font-semibold text-white">Privacy Model</h3>
              </div>
              <ul className="space-y-2">
                {[
                  "Risk score: FHE encrypted",
                  "Coverage amount: FHE encrypted",
                  "Premium: FHE computed, only you can reveal",
                  "Claim amounts: FHE validated",
                  "Payouts: revealed only at withdrawal",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                    <CheckCircle size={11} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>

            <Link href="/claims/new" className="block">
              <GlassButton variant="secondary" icon={<FileText size={14} />} className="w-full justify-center">
                File a New Claim
              </GlassButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
