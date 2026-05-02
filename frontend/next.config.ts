import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Single repo-root `.env` for API + Next (run `next dev` from `frontend/`)
const cwd = process.cwd();
const envRoot = fs.existsSync(path.join(cwd, ".env")) ? cwd : path.resolve(cwd, "..");
loadEnvConfig(envRoot);

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tooltip",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
