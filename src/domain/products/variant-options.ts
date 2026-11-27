import type { ContentLocale } from "./readiness";
import { slugify } from "./slug";

/** The three variant attributes a product can use, 0 to 3 at a time (F-011 CA-1). */
export const ATTRIBUTES = ["size", "scent", "color"] as const;

export type Attribute = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_NAMES: Record<Attribute, string> = {
  size: "Tamaño",
  scent: "Aroma",
  color: "Color",
};

type Localized<T> = Partial<Record<ContentLocale, T | null | undefined>> | null | undefined;

export interface OptionValue {
  code?: string | null;
  label?: Localized<string>;
}

export interface ProductOption {
  attribute?: Attribute | null;
  values?: readonly OptionValue[] | null;
}

/** A variant's attribute values: the `code` of one value per attribute, or empty. */
export type VariantValues = Partial<Record<Attribute, string | null | undefined>>;

export type Combination = Partial<Record<Attribute, string>>;

function codesOf(option: ProductOption): string[] {
  return (option.values ?? []).flatMap((value) => (value.code ? [value.code] : []));
}

function definedOptions(options: readonly ProductOption[] | null | undefined) {
  return (options ?? []).flatMap((option) =>
    option.attribute ? [{ attribute: option.attribute, codes: codesOf(option) }] : [],
  );
}

/**
 * Every combination of the product's attribute values (F-011 CA-1): 2 sizes × 2 scents → 4.
 * A product without attributes has a single, empty combination: its default variant.
 */
export function combinations(options: readonly ProductOption[] | null | undefined): Combination[] {
  return definedOptions(options).reduce<Combination[]>(
    (combos, { attribute, codes }) =>
      combos.flatMap((combo) => codes.map((code) => ({ ...combo, [attribute]: code }))),
    [{}],
  );
}

/** The attribute values a variant actually has, without empty ones. */
export function valuesOf(variant: VariantValues): Combination {
  const combo: Combination = {};
  for (const attribute of ATTRIBUTES) {
    const code = variant[attribute];
    if (code) combo[attribute] = code;
  }
  return combo;
}

/** Stable text key of a combination, the same whatever order the attributes were set in. */
export function combinationKey(variant: VariantValues): string {
  const combo = valuesOf(variant);
  return ATTRIBUTES.flatMap((attribute) =>
    combo[attribute] ? [`${attribute}=${combo[attribute]}`] : [],
  ).join("|");
}

/** Combinations that have no variant yet, for "Generar variantes" (F-011 HU-1). */
export function missingCombinations(
  options: readonly ProductOption[] | null | undefined,
  variants: readonly VariantValues[],
): Combination[] {
  const taken = new Set(variants.map(combinationKey));
  return combinations(options).filter((combo) => !taken.has(combinationKey(combo)));
}

/**
 * True when the variant has a valid value for each of the product's attributes and none for the
 * attributes the product does not use.
 */
export function variantMatchesOptions(
  variant: VariantValues,
  options: readonly ProductOption[] | null | undefined,
): boolean {
  const defined = definedOptions(options);
  return ATTRIBUTES.every((attribute) => {
    const code = variant[attribute] || null;
    const option = defined.find((candidate) => candidate.attribute === attribute);
    return option ? code !== null && option.codes.includes(code) : code === null;
  });
}

/**
 * Variants that use an attribute or a value removed between `before` and `after` (F-011 edge
 * case). They are deactivated, never deleted, so stock and orders keep their variant.
 */
export function affectedByRemoval<V extends VariantValues>(
  before: readonly ProductOption[] | null | undefined,
  after: readonly ProductOption[] | null | undefined,
  variants: readonly V[],
): V[] {
  const removed = new Set<string>();
  const kept = new Set(
    definedOptions(after).flatMap(({ attribute, codes }) => codes.map((c) => `${attribute}=${c}`)),
  );
  for (const { attribute, codes } of definedOptions(before)) {
    for (const code of codes) {
      if (!kept.has(`${attribute}=${code}`)) removed.add(`${attribute}=${code}`);
    }
  }
  return variants.filter((variant) =>
    ATTRIBUTES.some((attribute) => removed.has(`${attribute}=${variant[attribute]}`)),
  );
}

/** Fills each value's empty `code` from its Spanish label (the admin writes Spanish first). */
export function withCodes<O extends ProductOption>(options: readonly O[]): O[] {
  return options.map((option) => ({
    ...option,
    values: (option.values ?? []).map((value) => ({
      ...value,
      code: value.code || slugify(value.label?.es ?? "") || null,
    })),
  }));
}

/** Problems in the product's attribute list, as Spanish sentences for the admin. */
export function optionErrors(options: readonly ProductOption[] | null | undefined): string[] {
  const errors: string[] = [];
  const seen = new Set<Attribute>();
  for (const option of options ?? []) {
    if (!option.attribute) continue;
    const name = ATTRIBUTE_NAMES[option.attribute];
    if (seen.has(option.attribute)) errors.push(`El atributo «${name}» está repetido.`);
    seen.add(option.attribute);
    const values = option.values ?? [];
    if (values.some((value) => !value.code)) {
      errors.push(`Cada valor de «${name}» necesita una etiqueta en español.`);
    }
    const codes = codesOf(option);
    if (new Set(codes).size !== codes.length) {
      errors.push(`«${name}» tiene valores repetidos.`);
    }
  }
  return errors;
}
