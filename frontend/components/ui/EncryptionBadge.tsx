"use client";

type Status = "encrypted" | "encrypting" | "decrypted" | "computing";

const cfg: Record<Status, { label: string; color: string; dot: string }> = {
  encrypted: {
    label: "FHE ENCRYPTED",
    color: "rgba(0,255,136,0.08)",
    dot:   "var(--green)",
  },
  encrypting: {
    label: "ENCRYPTING…",
    color: "rgba(0,255,136,0.12)",
    dot:   "var(--green)",
  },
  decrypted: {
    label: "REVEALED",
    color: "rgba(96,165,250,0.1)",
    dot:   "var(--blue)",
  },
  computing: {
    label: "FHE COMPUTING…",
    color: "rgba(167,139,250,0.1)",
    dot:   "var(--violet)",
  },
};

export default function EncryptionBadge({
  status = "encrypted",
  className = "",
}: {
  status?: Status;
  className?: string;
}) {
  const { label, color, dot } = cfg[status];
  const isAnimated = status === "encrypting" || status === "computing";

  return (
    <span
      className={`inline-flex items-center gap-1.5 mono text-[9px] tracking-widest font-medium px-2 py-0.5 ${className}`}
      style={{
        background: color,
        border: `1px solid ${dot}30`,
        color: dot,
      }}
    >
      <span
        style={{
          width: 5, height: 5, borderRadius: "50%",
          background: dot,
          display: "inline-block",
          boxShadow: `0 0 5px ${dot}`,
          animation: isAnimated ? "pulse-dot 1.2s ease-in-out infinite" : undefined,
        }}
      />
      {label}
    </span>
  );
}
