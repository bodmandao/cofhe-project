"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "purple" | "green" | "amber" | "none";
  onClick?: () => void;
  animate?: boolean;
  accent?: boolean;
}

export default function GlassCard({
  children, className, hover = false, glow = "none",
  onClick, animate = false, accent = false,
}: GlassCardProps) {
  const base = clsx(
    "panel",
    accent || glow === "cyan" || glow === "green" ? "panel-accent" : "",
    glow === "amber" && "panel-amber",
    hover && "row-hover cursor-pointer",
    className,
  );

  if (animate) {
    return (
      <motion.div
        className={base}
        onClick={onClick}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={base} onClick={onClick}>{children}</div>;
}
