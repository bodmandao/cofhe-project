import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Stub Node.js built-ins that WalletConnect tries to import in browser bundles
    resolveAlias: {
      fs:  false,
      net: false,
      tls: false,
    },
  },
};

export default nextConfig;
