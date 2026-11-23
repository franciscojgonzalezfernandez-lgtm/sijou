import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { es } from "@payloadcms/translations/languages/es";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { serverEnv } from "./env";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = serverEnv();

export default buildConfig({
  serverURL: env.NEXT_PUBLIC_SITE_URL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: " · Sijou",
      // F-002 CA-8: the admin panel must never be indexed.
      robots: "noindex, nofollow",
    },
  },
  // F-002 CA-4: admin UI in Spanish only.
  i18n: { supportedLanguages: { es }, fallbackLanguage: "es" },
  collections: [Users],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL, max: 5 },
    // Schema changes only through versioned migrations (F-002 CA-5), never auto-push.
    push: false,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  graphQL: { disable: true },
  telemetry: false,
});
