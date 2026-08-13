import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts"
    ],
  },
};

export default nextConfig;
