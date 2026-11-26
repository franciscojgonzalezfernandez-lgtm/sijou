import { describe, expect, it } from "vitest";

import {
  contentLocales,
  formatMissing,
  isRichTextEmpty,
  publishReadiness,
  type ReadinessInput,
} from "./readiness";

function richText(text: string) {
  return {
    root: {
      type: "root",
      children: [{ type: "paragraph", children: [{ type: "text", text }] }],
    },
  };
}

function inAll<T>(value: (locale: string) => T) {
  return Object.fromEntries(contentLocales.map((locale) => [locale, value(locale)]));
}

function complete(): ReadinessInput {
  return {
    name: inAll((l) => `Crema ${l}`),
    slug: inAll((l) => `crema-${l}`),
    shortDescription: inAll((l) => `Corta ${l}`),
    description: inAll((l) => richText(`Larga ${l}`)),
    categoryCount: 1,
    variants: [{ sku: "CR-50", price: 24.9, active: true }],
    images: [{ alt: inAll((l) => `Foto ${l}`) }],
  };
}

describe("publishReadiness (F-010 CA-2)", () => {
  it("accepts a product complete in es, en and de", () => {
    expect(publishReadiness(complete())).toEqual({ ready: true, missing: [] });
  });

  it.each(["name", "slug", "shortDescription"] as const)(
    "CA-2: reports %s missing per language",
    (field) => {
      const product = complete();
      product[field] = { es: "Algo", en: "  ", de: null };
      expect(publishReadiness(product).missing).toEqual([
        { field, locale: "en" },
        { field, locale: "de" },
      ]);
    },
  );

  it("CA-3/CA-4: a Spanish-only draft lists every other language and requirement", () => {
    const result = publishReadiness({
      name: { es: "Crema" },
      slug: { es: "crema" },
      shortDescription: { es: "Corta" },
      description: { es: richText("Larga") },
      categoryCount: 0,
      variants: [],
      images: [],
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual([
      { field: "name", locale: "en" },
      { field: "slug", locale: "en" },
      { field: "shortDescription", locale: "en" },
      { field: "description", locale: "en" },
      { field: "name", locale: "de" },
      { field: "slug", locale: "de" },
      { field: "shortDescription", locale: "de" },
      { field: "description", locale: "de" },
      { field: "category" },
      { field: "variant" },
      { field: "image" },
    ]);
  });

  it("handles missing localized objects", () => {
    const product: ReadinessInput = { ...complete(), name: null, description: undefined };
    const fields = publishReadiness(product).missing.map((item) => item.field);
    expect(fields.filter((f) => f === "name")).toHaveLength(3);
    expect(fields.filter((f) => f === "description")).toHaveLength(3);
  });

  it("treats an empty long description as missing", () => {
    const product = complete();
    product.description = { ...product.description, de: richText("   ") };
    expect(publishReadiness(product).missing).toEqual([{ field: "description", locale: "de" }]);
  });

  it.each([
    ["no variants", []],
    ["inactive variant", [{ sku: "A", price: 10, active: false }]],
    ["variant without SKU", [{ sku: "", price: 10 }]],
    ["variant with zero price", [{ sku: "A", price: 0 }]],
    ["variant without price", [{ sku: "A", price: null }]],
  ])("CA-2: requires a sellable variant (%s)", (_case, variants) => {
    const product = { ...complete(), variants };
    expect(publishReadiness(product).missing).toEqual([{ field: "variant" }]);
  });

  it("accepts a variant whose active flag is unset", () => {
    const product = { ...complete(), variants: [{ sku: "A", price: 5 }] };
    expect(publishReadiness(product).ready).toBe(true);
  });

  it("CA-2: requires a category", () => {
    expect(publishReadiness({ ...complete(), categoryCount: 0 }).missing).toEqual([
      { field: "category" },
    ]);
  });

  it("CA-2: requires a photo", () => {
    expect(publishReadiness({ ...complete(), images: [] }).missing).toEqual([{ field: "image" }]);
  });

  it("requires photo alt text in each language", () => {
    const product = { ...complete(), images: [{ alt: { es: "Foto", en: "Photo" } }, {}] };
    expect(publishReadiness(product).missing).toEqual([
      { field: "imageAlt", locale: "es" },
      { field: "imageAlt", locale: "en" },
      { field: "imageAlt", locale: "de" },
    ]);
  });
});

describe("isRichTextEmpty", () => {
  it.each([null, undefined, "text", 3, {}, { root: {} }, { root: { children: [] } }])(
    "is empty for %j",
    (value) => {
      expect(isRichTextEmpty(value)).toBe(true);
    },
  );

  it("finds nested text", () => {
    expect(isRichTextEmpty(richText("Hola"))).toBe(false);
  });
});

describe("formatMissing (F-010 CA-4)", () => {
  it("groups fields by language and lists product requirements", () => {
    expect(
      formatMissing([
        { field: "name", locale: "de" },
        { field: "shortDescription", locale: "de" },
        { field: "description", locale: "en" },
        { field: "imageAlt", locale: "es" },
        { field: "slug", locale: "en" },
        { field: "category" },
        { field: "variant" },
        { field: "image" },
      ]),
    ).toEqual([
      "Falta en español: texto alternativo de las fotos.",
      "Falta en inglés: descripción larga, slug.",
      "Falta en alemán: nombre, descripción corta.",
      "Falta al menos una categoría.",
      "Falta al menos una variante activa con SKU y precio.",
      "Falta al menos una foto.",
    ]);
  });

  it("returns nothing when nothing is missing", () => {
    expect(formatMissing([])).toEqual([]);
  });
});

describe("publishReadiness with variant attributes (F-011)", () => {
  const scent = {
    attribute: "scent" as const,
    values: [{ code: "rosa", label: inAll(() => "Rosa") }],
  };

  it("accepts an active variant that has the product's attribute", () => {
    const product = {
      ...complete(),
      options: [scent],
      variants: [{ sku: "CR-ROSA", price: 20, scent: "rosa" }],
    };
    expect(publishReadiness(product).ready).toBe(true);
  });

  it("CA-1: needs the value labels in the 3 languages", () => {
    const product = {
      ...complete(),
      options: [{ ...scent, values: [{ code: "rosa", label: { es: "Rosa", en: "Rose" } }] }],
      variants: [{ sku: "CR-ROSA", price: 20, scent: "rosa" }],
    };
    expect(publishReadiness(product).missing).toEqual([{ field: "optionLabel", locale: "de" }]);
  });

  it("CA-1: an active variant without the product's attributes blocks publishing", () => {
    const product = {
      ...complete(),
      options: [scent],
      variants: [
        { sku: "CR-ROSA", price: 20, scent: "rosa" },
        { sku: "CR-OLD", price: 20 },
        { sku: "CR-OFF", price: 20, active: false },
      ],
    };
    expect(publishReadiness(product).missing).toEqual([{ field: "variantOptions" }]);
    expect(formatMissing([{ field: "variantOptions" }])).toEqual([
      "Falta que cada variante activa tenga un valor de cada atributo del producto.",
    ]);
  });

  it("CA-1: with only mismatched variants there is no sellable one", () => {
    const product = { ...complete(), options: [scent] };
    expect(publishReadiness(product).missing).toEqual([
      { field: "variant" },
      { field: "variantOptions" },
    ]);
  });
});

describe("publishReadiness with an attribute that has no values yet", () => {
  it("asks for no labels, but no variant can match it", () => {
    const product = { ...complete(), options: [{ attribute: "size" as const, values: null }] };
    expect(publishReadiness(product).missing).toEqual([
      { field: "variant" },
      { field: "variantOptions" },
    ]);
  });
});
