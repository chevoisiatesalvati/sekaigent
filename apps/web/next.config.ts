import type { NextConfig } from "next";
import path from "node:path";

const stub = path.join(__dirname, "stubs/empty.js");

const packageAliases = {
  "@x402/svm": stub,
  "@x402/svm/exact/client": stub,
  "@x402/evm": stub,
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sekaigent/game-schemas", "@sekaigent/sdk"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...packageAliases,
    };
    return config;
  },
  // Turbopack needs the same stubs when `next dev --turbopack` is used.
  turbopack: {
    resolveAlias: packageAliases,
  },
  // Allow importing deployment ABIs from monorepo root
  experimental: {
    externalDir: true,
    // Cuts webpack HMR peak RSS (next-server climbed to ~1.6GB in debug samples).
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
