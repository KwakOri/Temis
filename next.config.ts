import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false, // TypeScript 에러는 계속 표시
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        // R2 assets must be fetched directly so the export path observes the
        // response's CORS headers instead of a stale runtime-cache response.
        urlPattern: /^https:\/\/cloudflare\.temis\.kr(?:\/|$)/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offlineCache-v2",
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
});

export default withPWAConfig(nextConfig);
