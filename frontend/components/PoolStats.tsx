"use client";

import { useReadContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { formatEther } from "viem";
import { motion } from "framer-motion";
import { TrendingUp, Users, ShieldCheck, Coins } from "lucide-react";
import GlassCard from "./ui/GlassCard";
import { INSURANCE_ABI } from "@/utils/abi";
import { CONTRACT_ADDRESSES } from "@/utils/constants";

function Stat({
  label,
  value,
  icon,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </motion.div>
  );
}

export default function PoolStats({ chainId = arbitrumSepolia.id }: { chainId?: number }) {
  const address = CONTRACT_ADDRESSES[chainId];

  const { data: stats } = useReadContract({
    address,
    abi: INSURANCE_ABI,
    functionName: "getPoolStats",
  });

  const [balance, policies, active, claims, approved, payouts] = (stats as bigint[]) ?? [
    0n, 0n, 0n, 0n, 0n, 0n,
  ];

  return (
    <GlassCard className="p-6" animate glow="cyan">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Protocol Stats</h2>
        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
          Public aggregates only
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <Stat
          label="Pool Balance"
          value={`${parseFloat(formatEther(balance)).toFixed(3)} ETH`}
          icon={<Coins size={12} />}
          delay={0}
        />
        <Stat
          label="Total Policies"
          value={policies.toString()}
          icon={<Users size={12} />}
          delay={0.05}
        />
        <Stat
          label="Active Policies"
          value={active.toString()}
          icon={<ShieldCheck size={12} />}
          delay={0.1}
        />
        <Stat
          label="Claims Filed"
          value={claims.toString()}
          icon={<TrendingUp size={12} />}
          delay={0.15}
        />
        <Stat
          label="Approved Claims"
          value={approved.toString()}
          icon={<ShieldCheck size={12} />}
          delay={0.2}
        />
        <Stat
          label="Total Payouts"
          value={`${parseFloat(formatEther(payouts)).toFixed(4)} ETH`}
          icon={<Coins size={12} />}
          delay={0.25}
        />
      </div>
      <p className="mt-5 text-xs text-slate-600 border-t border-white/5 pt-4">
        Individual policies, risk profiles, and claim amounts are fully encrypted — only aggregate totals are public.
      </p>
    </GlassCard>
  );
}
