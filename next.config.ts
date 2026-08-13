import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false, // TypeScript 에러는 계속 표시
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  cacheStartUrl: false,
  dynamicStartUrl: false,
  customWorkerSrc: "worker",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Do not eagerly download public files or webpack assets when the worker
    // installs. Large template images made a single install hundreds of MB.
    additionalManifestEntries: [],
    exclude: [/.*/],
    runtimeCaching: [
      {
        // Keep a fetch handler for PWA installability without retaining large
        // images or responses in browser storage.
        urlPattern: /^https?.*/,
        handler: "NetworkOnly",
      },
    ],
  },
});

export default withPWAConfig(nextConfig);
