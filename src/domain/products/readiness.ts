import { isValidPrice } from "./price";
import { type ProductOption, type VariantValues, variantMatchesOptions } from "./variant-options";

/** Content languages, in the order the admin reads them (Spanish first, F-010 HU-1). */
export const contentLocales = ["es", "en", "de"] as const;

export type ContentLocale = (typeof contentLocales)[number];

type Localized<T> = Partial<Record<ContentLocale, T | null | undefined>> | null | undefined;

export interface ReadinessVariant extends VariantValues {
  sku?: string | null;
  price?: number | null;
  active?: boolean | null;
}

export interface ReadinessImage {
  alt?: Localized<string>;
}

/** Everything the publish rule needs, with localized fields in all languages (`locale: "all"`). */
export interface ReadinessInput {
  name?: Localized<string>;
  slug?: Localized<string>;
  shortDescription?: Localized<string>;
  description?: Localized<unknown>;
  categoryCount: number;
  /** Variant attributes and their values (F-011 CA-1). */
  options?: readonly ProductOption[] | null;
  variants: readonly ReadinessVariant[];
  images: readonly ReadinessImage[];
}

export type LocalizedField =
  "name" | "slug" | "shortDescription" | "description" | "imageAlt" | "optionLabel";
export type ProductRequirement = "category" | "variant" | "variantOptions" | "image";

export type MissingItem =
  { field: LocalizedField; locale: ContentLocale } | { field: ProductRequirement };

export interface Readiness {
  ready: boolean;
  missing: MissingItem[];
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** A Lexical editor state counts as empty when none of its nodes holds visible text. */
export function isRichTextEmpty(value: unknown): boolean {
  return !nodeHasText(value);
}

function nodeHasText(node: unknown): boolean {
  if (typeof node !== "object" || node === null) return false;
  const { text, root, children } = node as { text?: unknown; root?: unknown; children?: unknown };
  if (hasText(text)) return true;
  if (root !== undefined) return nodeHasText(root);
  return Array.isArray(children) && children.some(nodeHasText);
}

const TEXT_FIELDS = ["name", "slug", "shortDescription"] as const;

/**
 * F-010 CA-2 and F-011: a product can be published only when name, slug, short and long description exist
 * in es, en and de, and it has a category, an active variant with SKU and price, and a photo.
 * Photos also need their alternative text in the 3 languages (F-011 CA-6, brought forward).
 */
export function publishReadiness(product: ReadinessInput): Readiness {
  const missing: MissingItem[] = [];

  for (const locale of contentLocales) {
    for (const field of TEXT_FIELDS) {
      if (!hasText(product[field]?.[locale])) missing.push({ field, locale });
    }
    if (isRichTextEmpty(product.description?.[locale])) {
      missing.push({ field: "description", locale });
    }
    if (product.images.some((image) => !hasText(image.alt?.[locale]))) {
      missing.push({ field: "imageAlt", locale });
    }
    const values = (product.options ?? []).flatMap((option) => option.values ?? []);
    if (values.some((value) => !hasText(value.label?.[locale]))) {
      missing.push({ field: "optionLabel", locale });
    }
  }

  if (product.categoryCount < 1) missing.push({ field: "category" });
  const active = product.variants.filter((variant) => variant.active !== false);
  const matching = active.filter((variant) => variantMatchesOptions(variant, product.options));
  const sellable = matching.some((variant) => hasText(variant.sku) && isValidPrice(variant.price));
  if (!sellable) missing.push({ field: "variant" });
  // F-011: an active variant must have one valid value per attribute the product uses.
  if (matching.length < active.length) missing.push({ field: "variantOptions" });
  if (product.images.length < 1) missing.push({ field: "image" });

  return { ready: missing.length === 0, missing };
}

const LOCALE_NAMES: Record<ContentLocale, string> = {
  es: "español",
  en: "inglés",
  de: "alemán",
};

const FIELD_NAMES: Record<LocalizedField, string> = {
  name: "nombre",
  slug: "slug",
  shortDescription: "descripción corta",
  description: "descripción larga",
  imageAlt: "texto alternativo de las fotos",
  optionLabel: "etiquetas de los valores de las variantes",
};

const REQUIREMENT_NAMES: Record<ProductRequirement, string> = {
  category: "al menos una categoría",
  variant: "al menos una variante activa con SKU y precio",
  variantOptions: "que cada variante activa tenga un valor de cada atributo del producto",
  image: "al menos una foto",
};

/** CA-4: the missing items as Spanish sentences for the admin, grouped by language. */
export function formatMissing(missing: readonly MissingItem[]): string[] {
  const lines: string[] = [];
  for (const locale of contentLocales) {
    const fields = missing.flatMap((item) =>
      "locale" in item && item.locale === locale ? [FIELD_NAMES[item.field]] : [],
    );
    if (fields.length > 0) lines.push(`Falta en ${LOCALE_NAMES[locale]}: ${fields.join(", ")}.`);
  }
  for (const item of missing) {
    if (!("locale" in item)) lines.push(`Falta ${REQUIREMENT_NAMES[item.field]}.`);
  }
  return lines;
}
