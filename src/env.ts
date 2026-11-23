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

/** Vercel previews have no fixed URL: derive the site URL from VERCEL_URL when unset. */
function withDefaults(source: Source): Source {
  if (source.NEXT_PUBLIC_SITE_URL || !source.VERCEL_URL) return source;
  return { ...source, NEXT_PUBLIC_SITE_URL: `https://${source.VERCEL_URL}` };
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
