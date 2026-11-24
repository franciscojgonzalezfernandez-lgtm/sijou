import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { es } from "@payloadcms/translations/languages/es";
import { buildConfig } from "payload";
import sharp from "sharp";

import { AccessibleNameFeature } from "./components/admin/lexical-accessible-name/server";
import { Categories } from "./collections/Categories";
import { Media } from "./collections/Media";
import { Products } from "./collections/Products";
import { Users } from "./collections/Users";
import { Variants } from "./collections/Variants";
import { contentLocales } from "./domain/products/readiness";
import { serverEnv } from "./env";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = serverEnv();

const LOCALE_LABELS = { es: "Español", en: "Inglés", de: "Alemán" } as const;

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
  // F-010: content in es, en and de. Spanish first (the admin writes Spanish, then translates).
  // No fallback: a missing German text stays missing, in the shop and in the publish check.
  localization: {
    locales: contentLocales.map((code) => ({ code, label: LOCALE_LABELS[code] })),
    defaultLocale: "es",
    fallback: false,
  },
  collections: [Products, Variants, Categories, Media, Users],
  // AccessibleNameFeature: names the editable area after its field label (constitution II).
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, AccessibleNameFeature()],
  }),
  secret: env.PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL, max: 5 },
    // Schema changes only through versioned migrations (F-002 CA-5), never auto-push.
    push: false,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  plugins: [
    // F-010: photos in Vercel Blob on Vercel; without a token, files stay in media/ (local, CI).
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Same schema with and without the token, so migrations match everywhere.
      alwaysInsertFields: true,
      collections: {
        media: {
          // Previews and production never share files.
          prefix: process.env.VERCEL_ENV === "production" ? "media" : "preview/media",
          disablePayloadAccessControl: true,
        },
      },
    }),
  ],
  graphQL: { disable: true },
  telemetry: false,
});
