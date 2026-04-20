"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-500/20 to-violet-600/20 border-cyan-500/40 text-cyan-300 hover:from-cyan-500/30 hover:to-violet-600/30 hover:border-cyan-400/60 hover:text-white shadow-[0_0_20px_rgba(0,229,255,0.15)]",
  secondary:
    "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10 hover:border-white/25 hover:text-white",
  danger:
    "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-400/50",
  ghost:
    "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

export default function GlassButton({
  variant = "primary",
  loading = false,
  icon,
  size = "md",
  children,
  className,
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      {...(props as any)}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl border font-medium",
        "transition-all duration-200 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        styles[variant],
        sizes[size],
        className,
      )}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </motion.button>
  );
}
