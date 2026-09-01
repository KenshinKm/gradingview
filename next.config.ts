import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "heic-convert"],
  eslint: {
    // Lint is run explicitly in CI via `npm run lint`.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
