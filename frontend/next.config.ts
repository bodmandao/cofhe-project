import type { NextConfig } from "next";
import path from "path";

const SHIM = path.resolve("./shims/empty.js");

const nextConfig: NextConfig = {
  // Turbopack (next dev --turbopack)
  turbopack: {
    resolveAlias: {
      fs:  "./shims/empty.js",
      net: "./shims/empty.js",
      tls: "./shims/empty.js",
      "@react-native-async-storage/async-storage": "./shims/empty.js",
      "pino-pretty": "./shims/empty.js",
    },
  },

  // Webpack (next build)
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": SHIM,
      "pino-pretty": SHIM,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
