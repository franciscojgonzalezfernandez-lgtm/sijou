/**
 * Seeds test data (F-002 CA-7). Each feature extends this with its own collections.
 * Idempotent: safe to run on every preview deploy and locally.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload, type Payload } from "payload";

import { contentLocales } from "../src/domain/products/readiness";
import { lotsOf, receiveLot } from "../src/lib/stock";
import config from "../src/payload.config";
import { SEED_SKU, seedProduct, seedTaxonomy } from "./seed-data";

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
await seedCategoriesAndCollections(payload);
await seedLots(payload);

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
    data: { name: p.category.es, status: "draft", position: 0 },
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

/**
 * F-012: the sample category published with its texts and banner, a published subcategory and a
 * published collection with the sample product. Each step checks first, so reruns change nothing.
 */
async function seedCategoriesAndCollections(payload: Payload) {
  const t = seedTaxonomy;
  const [category] = (
    await payload.find({
      collection: "categories",
      locale: "es",
      where: { slug: { equals: t.category.slug.es } },
      limit: 1,
      depth: 0,
    })
  ).docs;
  const [variant] = (
    await payload.find({
      collection: "variants",
      where: { sku: { equals: SEED_SKU } },
      limit: 1,
      depth: 0,
    })
  ).docs;
  if (!category || !variant) {
    payload.logger.warn("Seed: sample category or product missing, skipping F-012 data");
    return;
  }
  const productId = typeof variant.product === "object" ? variant.product.id : variant.product;
  const product = await payload.findByID({ collection: "products", id: productId, depth: 0 });
  const first = product.gallery?.[0]?.image;
  const headerImage = typeof first === "object" && first !== null ? first.id : first;

  // The migration publishes categories that already exist, so look at the texts, not the status.
  if (!category.description) {
    for (const locale of contentLocales) {
      await payload.update({
        collection: "categories",
        id: category.id,
        locale,
        data: { description: richText(t.category.description[locale]), headerImage },
      });
    }
  }
  if (category.status !== "published") {
    await payload.update({
      collection: "categories",
      id: category.id,
      data: { status: "published" },
    });
  }

  const subcategory = await payload.find({
    collection: "categories",
    locale: "es",
    where: { slug: { equals: t.subcategory.slug.es } },
    limit: 1,
    depth: 0,
  });
  if (subcategory.totalDocs === 0) {
    const created = await payload.create({
      collection: "categories",
      locale: "es",
      data: { name: t.subcategory.name.es, parent: category.id, status: "draft", position: 0 },
    });
    for (const locale of contentLocales) {
      await payload.update({
        collection: "categories",
        id: created.id,
        locale,
        data: { name: t.subcategory.name[locale], slug: t.subcategory.slug[locale] },
      });
    }
    await payload.update({
      collection: "categories",
      id: created.id,
      data: { status: "published" },
    });
  }

  const collection = await payload.find({
    collection: "product-collections",
    locale: "es",
    where: { slug: { equals: t.collection.slug.es } },
    limit: 1,
    depth: 0,
  });
  if (collection.totalDocs === 0) {
    const created = await payload.create({
      collection: "product-collections",
      locale: "es",
      data: { name: t.collection.name.es, status: "draft", products: [productId], headerImage },
    });
    for (const locale of contentLocales) {
      await payload.update({
        collection: "product-collections",
        id: created.id,
        locale,
        data: {
          name: t.collection.name[locale],
          slug: t.collection.slug[locale],
          description: richText(t.collection.description[locale]),
        },
      });
    }
    await payload.update({
      collection: "product-collections",
      id: created.id,
      data: { status: "published" },
    });
  }
  payload.logger.info("Seed: sample categories and collection ready");
}

/**
 * F-013: two lots of the sample variant, one expiring in six months and one that does not
 * expire, each with its receipt movement by the System. Skipped when the variant has lots.
 */
async function seedLots(payload: Payload) {
  const [variant] = (
    await payload.find({
      collection: "variants",
      where: { sku: { equals: SEED_SKU } },
      limit: 1,
      depth: 0,
    })
  ).docs;
  if (!variant) return;
  if ((await lotsOf(payload, variant.id)).length > 0) return;
  const inSixMonths = new Date();
  inSixMonths.setUTCMonth(inSixMonths.getUTCMonth() + 6);
  await receiveLot(payload, null, {
    variantId: variant.id,
    code: "SEED-A",
    quantity: 20,
    expiresAt: inSixMonths.toISOString().slice(0, 10),
  });
  await receiveLot(payload, null, { variantId: variant.id, code: "SEED-B", quantity: 10 });
  payload.logger.info("Seed: registered 2 lots of the sample variant");
}
