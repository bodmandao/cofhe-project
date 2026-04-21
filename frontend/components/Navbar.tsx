"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const NAV = [
  { href: "/dashboard",  label: "DASHBOARD" },
  { href: "/policy/new", label: "GET INSURED" },
  { href: "/claims/new", label: "FILE CLAIM" },
];

export default function Navbar() {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 nav-sweep"
      style={{
        background: "rgba(4,5,13,0.94)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(0,255,136,0.07)",
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 h-[52px] flex items-center justify-between gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="flex items-center gap-2">
            <div className="status-dot" />
            <span
              className="mono font-bold tracking-[0.15em] text-sm"
              style={{ color: "var(--green)" }}
            >
              ◈ SHIELDFI
            </span>
          </div>
          <span
            className="hidden lg:block mono text-[10px] tracking-widest"
            style={{ color: "var(--gray-2)" }}
          >
            / ENCRYPTED INSURANCE
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className="relative">
                <span
                  className="mono text-[11px] tracking-[0.12em] font-medium transition-colors duration-150"
                  style={{ color: active ? "var(--green)" : "var(--gray-1)" }}
                  onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.color = "var(--white)"; }}
                  onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.color = "var(--gray-1)"; }}
                >
                  {label}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -bottom-[18px] left-0 right-0 h-px"
                    style={{ background: "var(--green)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 mono text-[10px] tracking-widest px-2.5 py-1"
            style={{
              border: "1px solid rgba(0,255,136,0.18)",
              background: "rgba(0,255,136,0.05)",
              color: "var(--green)",
            }}
          >
            <div className="status-dot" style={{ width: 5, height: 5 }} />
            COFHE
          </div>

          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />

          <button
            className="md:hidden mono text-[10px] tracking-widest px-2 py-1"
            style={{ color: "var(--gray-1)", border: "1px solid var(--border-mid)" }}
            onClick={() => setOpen(!open)}
          >
            {open ? "CLOSE" : "MENU"}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="mono text-[11px] tracking-widest"
                  style={{ color: pathname === href ? "var(--green)" : "var(--gray-1)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
