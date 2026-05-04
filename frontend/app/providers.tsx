"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useWalletClient, usePublicClient } from "wagmi";
import { http } from "viem";
import { arbitrumSepolia, sepolia } from "wagmi/chains";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { CofheProvider, useCofheAutoConnect } from "@cofhe/react";

const config = getDefaultConfig({
  appName: "ShieldFi — Confidential Insurance",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "shieldfi-demo",
  chains: [arbitrumSepolia, sepolia],
  transports: {
    [arbitrumSepolia.id]: http(),
    [sepolia.id]:         http(),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000 } },
});

const rainbowTheme = darkTheme({
  accentColor: "#00ff88",
  accentColorForeground: "#04050d",
  borderRadius: "none",
  fontStack: "system",
});

function CofheAutoConnector() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  useCofheAutoConnect({
    walletClient: walletClient ?? undefined,
    publicClient: publicClient ?? undefined,
  });
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>
          <CofheProvider>
            <CofheAutoConnector />
            {children}
          </CofheProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
