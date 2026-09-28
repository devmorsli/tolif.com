import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // MinIO (local dev)
      { protocol: "http", hostname: "localhost", port: "9000" },
      // Production S3/R2 (set via env when deploying)
      ...(process.env.S3_HOSTNAME
        ? [{ protocol: "https" as const, hostname: process.env.S3_HOSTNAME }]
        : []),
    ],
  },
  // Expose only safe public env vars to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
  },
};

export default nextConfig;
