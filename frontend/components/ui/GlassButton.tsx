"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size    = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary:   "btn-primary",
  secondary: "btn-outline",
  danger:    "btn-ghost",
  ghost:     "btn-ghost",
};

const sizeExtra: Record<Size, string> = {
  sm: "!text-[10px] !px-3 !py-1.5 !gap-1.5",
  md: "",
  lg: "!text-[12px] !px-6 !py-3",
};

export default function GlassButton({
  variant = "primary", loading = false, icon, size = "md",
  children, className, disabled, ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        variantClass[variant],
        sizeExtra[size],
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
