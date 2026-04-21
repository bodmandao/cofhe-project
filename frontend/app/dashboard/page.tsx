"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import EncryptionBadge from "@/components/ui/EncryptionBadge";
import PoolStats from "@/components/PoolStats";
import { useUserPolicies, useUserClaims, usePolicy, useClaim } from "@/hooks/useInsurance";
import { POLICY_STATUS_MAP, CLAIM_STATUS_MAP } from "@/utils/constants";

const CLAIM_COLOR: Record<number, string> = {
  0: "var(--amber)",
  1: "var(--green)",
  2: "var(--red)",
  3: "var(--blue)",
};

function PolicyRow({ policyId }: { policyId: bigint }) {
  const { data: policy } = usePolicy(policyId);
  const p = policy as any;
  const isActive  = p?.status === 0;
  const isPastDue = p && isActive && Number(p.premiumPaidUntil) < Date.now() / 1000;
  const until     = p?.premiumPaidUntil && Number(p.premiumPaidUntil) > 0
    ? new Date(Number(p.premiumPaidUntil) * 1000).toLocaleDateString()
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3.5 row-hover"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: isActive ? "var(--green)" : "var(--gray-2)",
          boxShadow: isActive ? "0 0 6px var(--green)" : "none",
          flexShrink: 0,
        }}
      />

      {/* ID + encryption status */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
            POLICY #{policyId.toString()}
          </span>
          <span
            className="mono text-[9px] tracking-widest px-1.5 py-0.5"
            style={{
              color: isActive ? "var(--green)" : "var(--gray-2)",
              border: `1px solid ${isActive ? "rgba(0,255,136,0.2)" : "var(--border-mid)"}`,
            }}
          >
            {POLICY_STATUS_MAP[p?.status ?? 0]}
          </span>
          {isPastDue && (
            <span
              className="mono text-[9px] tracking-widest px-1.5 py-0.5"
              style={{ color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              PREMIUM DUE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <EncryptionBadge status="encrypted" />
          <span className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
            coverage until {until}
          </span>
        </div>
      </div>

      {/* Coverage period */}
      <span className="mono text-[10px] hidden sm:block" style={{ color: "var(--gray-2)" }}>
        {p?.createdAt ? new Date(Number(p.createdAt) * 1000).toLocaleDateString() : "—"}
      </span>

      {/* Action */}
      <Link href={`/claims/new?policy=${policyId}`}>
        <button className="btn-ghost !text-[10px] !py-1.5 !px-3">
          FILE CLAIM <ArrowRight size={10} />
        </button>
      </Link>
    </motion.div>
  );
}

function ClaimRow({ claimId }: { claimId: bigint }) {
  const { data: claim } = useClaim(claimId);
  const c      = claim as any;
  const color  = CLAIM_COLOR[c?.status ?? 0];
  const status = CLAIM_STATUS_MAP[c?.status ?? 0];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-3.5 row-hover"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: color, boxShadow: `0 0 5px ${color}`,
          flexShrink: 0,
        }}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-xs font-bold" style={{ color: "var(--white)" }}>
            CLAIM #{claimId.toString()}
          </span>
          <span
            className="mono text-[9px] tracking-widest px-1.5 py-0.5"
            style={{ color, border: `1px solid ${color}30` }}
          >
            {status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <EncryptionBadge status="encrypted" />
          <span className="mono text-[10px]" style={{ color: "var(--gray-2)" }}>
            filed {c?.filedAt ? new Date(Number(c.filedAt) * 1000).toLocaleDateString() : "—"}
          </span>
        </div>
      </div>

      {c?.status === 1 && (
        <span className="mono text-[10px]" style={{ color: "var(--green)" }}>
          ELIGIBLE FOR WITHDRAWAL
        </span>
      )}
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { data: policyIds } = useUserPolicies();
  const { data: claimIds }  = useUserClaims();
  const policies = (policyIds as bigint[] | undefined) ?? [];
  const claims   = (claimIds  as bigint[] | undefined) ?? [];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="panel panel-accent p-10 max-w-sm w-full text-center">
            <Lock size={28} style={{ color: "var(--green)", margin: "0 auto 16px" }} />
            <h2 className="font-black text-xl mb-3" style={{ letterSpacing: "-0.02em" }}>
              CONNECT WALLET
            </h2>
            <p className="text-sm" style={{ color: "var(--gray-1)" }}>
              Connect to view your encrypted policies and claims.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">

        {/* ── Page header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="mono text-[10px] tracking-widest" style={{ color: "var(--green)" }}>
              // POLICY VAULT
            </span>
            <h1 className="font-black text-2xl mt-1" style={{ letterSpacing: "-0.03em" }}>
              DASHBOARD
            </h1>
            <p className="mono text-[10px] mt-1 tracking-wider" style={{ color: "var(--gray-2)" }}>
              {address}
            </p>
          </div>
          <Link href="/policy/new">
            <button className="btn-primary !text-[10px]">
              <Plus size={12} /> NEW POLICY
            </button>
          </Link>
        </div>

        {/* ── Two-column layout ────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">

          {/* Left: tables */}
          <div className="space-y-8">

            {/* Policies table */}
            <div>
              <div
                className="flex items-center justify-between px-5 py-3 mono text-[10px] tracking-widest"
                style={{ border: "1px solid var(--border)", borderBottom: "none", background: "var(--surface-2)" }}
              >
                <span style={{ color: "var(--green)" }}>// MY POLICIES</span>
                <span style={{ color: "var(--gray-2)" }}>{policies.length} TOTAL</span>
              </div>

              {policies.length === 0 ? (
                <div
                  className="px-5 py-12 text-center"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <p className="mono text-[11px] mb-4" style={{ color: "var(--gray-2)" }}>
                    NO POLICIES FOUND
                  </p>
                  <Link href="/policy/new">
                    <button className="btn-primary !text-[10px]">
                      GET INSURED <ArrowRight size={12} />
                    </button>
                  </Link>
                </div>
              ) : (
                <div style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  {/* Table header */}
                  <div
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-2 mono text-[9px] tracking-widest"
                    style={{ borderBottom: "1px solid var(--border)", color: "var(--gray-2)" }}
                  >
                    <span>ST</span>
                    <span>ID / ENCRYPTION</span>
                    <span className="hidden sm:block">CREATED</span>
                    <span>ACTION</span>
                  </div>
                  {policies.map(id => <PolicyRow key={id.toString()} policyId={id} />)}
                </div>
              )}
            </div>

            {/* Claims table */}
            <div>
              <div
                className="flex items-center justify-between px-5 py-3 mono text-[10px] tracking-widest"
                style={{ border: "1px solid var(--border)", borderBottom: "none", background: "var(--surface-2)" }}
              >
                <span style={{ color: "var(--amber)" }}>// MY CLAIMS</span>
                <span style={{ color: "var(--gray-2)" }}>{claims.length} TOTAL</span>
              </div>

              {claims.length === 0 ? (
                <div
                  className="px-5 py-12 text-center"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <p className="mono text-[11px]" style={{ color: "var(--gray-2)" }}>
                    NO CLAIMS FILED
                  </p>
                </div>
              ) : (
                <div style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div
                    className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-2 mono text-[9px] tracking-widest"
                    style={{ borderBottom: "1px solid var(--border)", color: "var(--gray-2)" }}
                  >
                    <span>ST</span>
                    <span>ID / ENCRYPTION</span>
                    <span>STATUS</span>
                  </div>
                  {claims.map(id => <ClaimRow key={id.toString()} claimId={id} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <PoolStats />

            {/* Privacy legend */}
            <div className="panel p-5">
              <div
                className="mono text-[10px] tracking-widest mb-4 pb-3"
                style={{ borderBottom: "1px solid var(--border)", color: "var(--green)" }}
              >
                // PRIVACY MODEL
              </div>
              <ul className="space-y-2.5">
                {[
                  "Risk score — FHE encrypted",
                  "Coverage — FHE encrypted",
                  "Premium — FHE computed, only you reveal",
                  "Claim amounts — FHE validated",
                  "Payout — revealed at withdrawal only",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 mono text-[10px]" style={{ color: "var(--gray-1)" }}>
                    <span style={{ color: "var(--green)", flexShrink: 0 }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/claims/new">
              <button className="btn-outline w-full justify-center">
                FILE A NEW CLAIM <ArrowRight size={12} />
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
