import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";

import { serverEnv } from "./src/env";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

// F-002 CA-6: refuse to build or serve when a required variable is missing.
// Other phases (typegen, lint, info) do not need the runtime environment.
const RUNTIME_PHASES = new Set([
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
]);

export default function config(phase: string): NextConfig {
  if (RUNTIME_PHASES.has(phase)) serverEnv();
  return withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });
}
