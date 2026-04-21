"use client";

import dynamic from "next/dynamic";

// WalletConnect accesses indexedDB which is browser-only — must not SSR
const Providers = dynamic(() => import("./providers"), { ssr: false });

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
