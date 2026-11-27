/**
 * Seeds test data (F-002 CA-7). Each feature extends this with its own collections.
 * Idempotent: safe to run on every preview deploy and locally.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload, type Payload } from "payload";

import { contentLocales } from "../src/domain/products/readiness";
import config from "../src/payload.config";
import { SEED_SKU, seedProduct } from "./seed-data";

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

await seedCatalog(payload);

process.exit(0);

function richText(text: string) {
  return {
    root: {
      type: "root",
      format: "" as const,
      indent: 0,
      version: 1,
      direction: "ltr" as const,
      children: [
        {
          type: "paragraph",
          format: "" as const,
          indent: 0,
          version: 1,
          direction: "ltr" as const,
          textFormat: 0,
          children: [
            { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
          ],
        },
      ],
    },
  };
}

/** F-010: one complete, published product in es, en and de, with category, variant and photo. */
async function seedCatalog(payload: Payload) {
  const existing = await payload.find({
    collection: "variants",
    where: { sku: { equals: SEED_SKU } },
    limit: 1,
  });
  if (existing.totalDocs > 0) {
    payload.logger.info("Seed: sample product already exists");
    return;
  }

  const p = seedProduct;
  const category = await payload.create({
    collection: "categories",
    locale: "es",
    data: { name: p.category.es },
  });
  const image = await payload.create({
    collection: "media",
    locale: "es",
    data: { alt: p.alt.es },
    filePath: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../e2e/fixtures/sample-product.jpg",
    ),
  });
  const product = await payload.create({
    collection: "products",
    locale: "es",
    data: {
      name: p.name.es,
      status: "draft",
      restockType: "replenishable",
      categories: [category.id],
      gallery: [{ image: image.id }],
    },
  });
  for (const locale of contentLocales) {
    await payload.update({
      collection: "categories",
      id: category.id,
      locale,
      data: { name: p.category[locale] },
    });
    await payload.update({
      collection: "media",
      id: image.id,
      locale,
      data: { alt: p.alt[locale] },
    });
    await payload.update({
      collection: "products",
      id: product.id,
      locale,
      data: {
        name: p.name[locale],
        slug: p.slug[locale],
        shortDescription: p.shortDescription[locale],
        description: richText(p.description[locale]),
        usage: p.usage[locale],
        pao: p.pao[locale],
      },
    });
  }
  await payload.create({
    collection: "variants",
    data: { product: product.id, sku: SEED_SKU, price: p.price, active: true },
  });
  await payload.update({ collection: "products", id: product.id, data: { status: "published" } });
  payload.logger.info("Seed: created and published the sample product");
}
