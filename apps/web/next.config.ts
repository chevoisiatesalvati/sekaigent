import type { NextConfig } from "next";
import path from "node:path";

const stub = path.join(__dirname, "stubs/empty.js");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sekaigent/game-schemas"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/svm": stub,
      "@x402/svm/exact/client": stub,
      "@x402/evm": stub,
    };
    return config;
  },
  // Allow importing deployment ABIs from monorepo root
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
