import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

// WalletConnect accesses indexedDB which is browser-only — must not SSR
const Providers = dynamic(() => import("./providers"), { ssr: false });

export const metadata: Metadata = {
  title: "ShieldFi — Confidential Insurance Protocol",
  description:
    "Privacy-preserving insurance powered by Fhenix FHE. Your risk profile, coverage, and claims are computed entirely on encrypted data — never exposed on-chain.",
  keywords: ["FHE", "insurance", "Fhenix", "DeFi", "privacy", "CoFHE"],
  openGraph: {
    title: "ShieldFi",
    description: "Confidential insurance. FHE-native privacy.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {/* Animated background orbs */}
        <div className="orb orb-1" aria-hidden />
        <div className="orb orb-2" aria-hidden />
        <div className="orb orb-3" aria-hidden />
        <Providers>
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
