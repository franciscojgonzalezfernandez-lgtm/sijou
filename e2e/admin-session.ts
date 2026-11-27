import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { request, type FullConfig, type Page } from "@playwright/test";

/**
 * One admin login for the whole run. Payload keeps a user's sessions in a list on the user row;
 * parallel logins of the same admin overwrite each other's session there, so a test could find
 * itself logged out half-way. The global setup logs in once and every test reuses that session.
 */
const SESSION_FILE = path.join(import.meta.dirname, "../playwright/.auth/admin.json");

interface Session {
  token: string;
  cookies: Awaited<
    ReturnType<Awaited<ReturnType<typeof request.newContext>>["storageState"]>
  >["cookies"];
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  // Production has no test admin (F-002 CA-7); the admin specs skip themselves there.
  if (process.env.DEPLOY_ENV === "Production" || !email || !password) return;

  const { baseURL, extraHTTPHeaders } = config.projects[0]?.use ?? {};
  const context = await request.newContext({ baseURL, extraHTTPHeaders });
  const response = await context.post("/api/users/login", { data: { email, password } });
  if (!response.ok()) {
    throw new Error(`Admin login failed: ${response.status()} ${await response.text()}`);
  }
  const { token } = (await response.json()) as { token: string };
  // Only Payload's auth cookie: the bypass cookie is set per browser context (fixtures.ts).
  const cookies = (await context.storageState()).cookies.filter((c) =>
    c.name.startsWith("payload"),
  );
  await context.dispose();
  await mkdir(path.dirname(SESSION_FILE), { recursive: true });
  await writeFile(SESSION_FILE, JSON.stringify({ token, cookies } satisfies Session));
}

/** Signs the page's browser in as the test admin and returns the token for API calls. */
export async function adminSession(page: Page): Promise<string> {
  const { token, cookies } = JSON.parse(await readFile(SESSION_FILE, "utf8")) as Session;
  await page.context().addCookies(cookies);
  return token;
}
