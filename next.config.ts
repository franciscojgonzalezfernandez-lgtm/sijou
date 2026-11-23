import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

import { serverEnv } from "./src/env";

// F-002 CA-6: fail the build (and `next dev`) when a required variable is missing.
serverEnv();

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
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
  // F-002 CA-8: belt and braces on top of robots.txt.
  headers: () =>
    Promise.resolve([
      { source: "/admin/:path*", headers: noindex },
      { source: "/admin", headers: noindex },
      { source: "/api/:path*", headers: noindex },
    ]),
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
