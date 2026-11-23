/**
 * Seeds test data (F-002 CA-7). Each feature extends this with its own collections.
 * Idempotent: safe to run on every preview deploy and locally.
 */
import { getPayload } from "payload";

import config from "../src/payload.config";

// Test data must never reach production: previews seed their own Neon branch (F-002 CA-2).
if (process.env.VERCEL_ENV === "production") {
  throw new Error("Refusing to seed: VERCEL_ENV is production.");
}

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to seed.");
}

const payload = await getPayload({ config });

const existing = await payload.find({
  collection: "users",
  where: { email: { equals: email } },
  limit: 1,
});

if (existing.totalDocs === 0) {
  await payload.create({ collection: "users", data: { email, password } });
  payload.logger.info(`Seed: created test admin ${email}`);
} else {
  payload.logger.info(`Seed: test admin ${email} already exists`);
}

process.exit(0);
