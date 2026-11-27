/**
 * pg treats sslmode `prefer`, `require` and `verify-ca` as `verify-full` and logs a security
 * warning on every connection (they will change meaning in its next major). Neon URLs come with
 * `sslmode=require`; spelling out `verify-full` keeps today's behaviour without the warning.
 */
const VERIFY_FULL_ALIASES = new Set(["prefer", "require", "verify-ca"]);

export function withExplicitSslMode(databaseURL: string): string {
  const url = new URL(databaseURL);
  const mode = url.searchParams.get("sslmode");
  if (mode === null || !VERIFY_FULL_ALIASES.has(mode)) return databaseURL;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
