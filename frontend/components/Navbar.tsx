"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shield, LayoutDashboard, FileText, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { clsx } from "clsx";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  { href: "/policy/new", label: "Get Insured", icon: <Shield size={15} /> },
  { href: "/claims/new", label: "File Claim",  icon: <FileText size={15} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10 px-4 py-3">
      <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-600/30 border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-400/60 transition-colors">
            <Shield size={16} className="text-cyan-400" />
          </div>
          <span className="font-bold text-white">
            Shield<span className="gradient-text">Fi</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150",
                pathname === href
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet + mobile menu */}
        <div className="flex items-center gap-2">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-white/10 mt-3"
          >
            <div className="py-3 flex flex-col gap-1">
              {navLinks.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    pathname === href
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "text-slate-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  {icon}
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
