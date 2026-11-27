import { z } from "zod";

/**
 * Server environment schema (F-002 CA-6). Validated when Next.js and Payload start,
 * so a missing variable fails fast with its name instead of failing at first use.
 */
export const serverEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PAYLOAD_SECRET: z.string().min(32, "must be at least 32 characters"),
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type Source = Record<string, string | undefined>;

/**
 * Without an explicit site URL, derive it from Vercel's system variables: production uses the
 * project's production domain (never the per-deployment host, which sits behind Vercel
 * Authentication), previews use their own deployment host.
 */
function withDefaults(source: Source): Source {
  if (source.NEXT_PUBLIC_SITE_URL) return source;
  const host =
    (source.VERCEL_ENV === "production" ? source.VERCEL_PROJECT_PRODUCTION_URL : undefined) ??
    source.VERCEL_URL;
  return host ? { ...source, NEXT_PUBLIC_SITE_URL: `https://${host}` } : source;
}

/**
 * Origins allowed to make cookie-authenticated requests to Payload (its CSRF allowlist).
 * A deployment is reachable on several hosts (production domain, branch alias, deployment URL);
 * the admin panel must work on whichever one the browser opened.
 */
export function trustedOrigins(source: Source, siteURL: string): string[] {
  const hosts = [source.VERCEL_PROJECT_PRODUCTION_URL, source.VERCEL_BRANCH_URL, source.VERCEL_URL];
  const origins = [
    new URL(siteURL).origin,
    ...hosts.filter((host): host is string => Boolean(host)).map((host) => `https://${host}`),
  ];
  return [...new Set(origins)];
}

export function parseServerEnv(source: Source): ServerEnv {
  const result = serverEnvSchema.safeParse(withDefaults(source));
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join(".");
    const value = source[name];
    return value === undefined || value === ""
      ? `- ${name}: missing`
      : `- ${name}: ${issue.message}`;
  });
  throw new Error(`Invalid environment variables (see .env.example):\n${problems.join("\n")}`);
}

let cached: ServerEnv | undefined;

/** Validated server environment, parsed once per process. */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
