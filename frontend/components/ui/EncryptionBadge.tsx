"use client";

import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

type Status = "encrypted" | "encrypting" | "decrypted" | "computing";

const config: Record<Status, { label: string; color: string; icon: React.ReactNode; pulse: boolean }> = {
  encrypted: {
    label: "FHE Encrypted",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    icon: <Lock size={11} />,
    pulse: false,
  },
  encrypting: {
    label: "Encrypting…",
    color: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
    icon: <Lock size={11} />,
    pulse: true,
  },
  decrypted: {
    label: "Revealed",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
    icon: <ShieldCheck size={11} />,
    pulse: false,
  },
  computing: {
    label: "FHE Computing…",
    color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    icon: <Lock size={11} />,
    pulse: true,
  },
};

export default function EncryptionBadge({
  status = "encrypted",
  className,
}: {
  status?: Status;
  className?: string;
}) {
  const { label, color, icon, pulse } = config[status];

  return (
    <motion.span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        color,
        pulse && "encrypt-pulse",
        className,
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {icon}
      {label}
    </motion.span>
  );
}
