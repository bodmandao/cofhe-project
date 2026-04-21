import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";
import "./globals.css";

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
        <ProvidersWrapper>
          <div className="relative z-10">{children}</div>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
