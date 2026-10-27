import type { NextConfig } from "next";

// Validates env vars at boot: dev/build crash here if any var is missing,
// before the app even starts. Keep it as the first import.
import "./env";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
