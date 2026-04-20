"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "purple" | "green" | "none";
  onClick?: () => void;
  animate?: boolean;
}

export default function GlassCard({
  children,
  className,
  hover = false,
  glow = "none",
  onClick,
  animate = false,
}: GlassCardProps) {
  const glowClass = {
    cyan:   "glow-cyan",
    purple: "glow-purple",
    green:  "glow-green",
    none:   "",
  }[glow];

  const base = clsx(
    "glass",
    hover && "glass-hover cursor-pointer",
    glowClass,
    className,
  );

  if (animate) {
    return (
      <motion.div
        className={base}
        onClick={onClick}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={hover ? { scale: 1.01 } : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={base} onClick={onClick}>
      {children}
    </div>
  );
}
