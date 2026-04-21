import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Stub Node.js built-ins that WalletConnect tries to import in browser bundles
    resolveAlias: {
      fs:  "./shims/empty.js",
      net: "./shims/empty.js",
      tls: "./shims/empty.js",
    },
  },
};

export default nextConfig;
