import { revalidateTag } from "next/cache";
import type { CollectionSlug, TextField, Validate } from "payload";

import { slugify } from "@/domain/products/slug";

/** Cache tag for everything the storefront reads from the catalog. */
export const CATALOG_TAG = "catalog";

/**
 * Expire the storefront's catalog cache so publishing, hiding or archiving shows at once.
 * Outside a Next.js request (seed script, migrations) there is no cache to expire.
 */
export function expireCatalog(): void {
  try {
    revalidateTag(CATALOG_TAG, { expire: 0 });
  } catch {
    // Not running inside Next.js: nothing cached to expire.
  }
}

/**
 * Localized slug (F-010 CA-6): generated from `name` in the language being edited when empty,
 * editable, URL-safe and unique per language within the collection.
 */
export function slugField(collection: CollectionSlug): TextField {
  const validate: Validate<string> = async (value, { req, id }) => {
    if (!value) return true;
    if (value !== slugify(value)) return "Solo minúsculas sin acentos, números y guiones.";
    const locale = typeof req.locale === "string" && req.locale !== "all" ? req.locale : undefined;
    const clash = await req.payload.find({
      collection,
      locale,
      where: {
        and: [{ slug: { equals: value } }, ...(id ? [{ id: { not_equals: id } }] : [])],
      },
      limit: 1,
      depth: 0,
      pagination: false,
      req,
    });
    return clash.docs.length === 0 ? true : "Ya existe otro elemento con este slug en este idioma.";
  };

  return {
    name: "slug",
    type: "text",
    label: "Slug (URL)",
    localized: true,
    index: true,
    admin: {
      description: "Se genera a partir del nombre si lo dejas vacío. Una por idioma.",
    },
    hooks: {
      beforeValidate: [
        ({ value, siblingData }): unknown => {
          const current: unknown = value;
          if (typeof current === "string" && current.trim()) return slugify(current);
          const name = (siblingData as { name?: unknown }).name;
          return typeof name === "string" && name.trim() ? slugify(name) : current;
        },
      ],
    },
    validate,
  };
}
