import { describe, expect, it } from "vitest";

import {
  affectedByRemoval,
  combinationKey,
  combinations,
  missingCombinations,
  optionErrors,
  type ProductOption,
  valuesOf,
  variantMatchesOptions,
  withCodes,
} from "./variant-options";

const value = (code: string) => ({ code, label: { es: code, en: code, de: code } });
const size: ProductOption = { attribute: "size", values: [value("50-ml"), value("100-ml")] };
const scent: ProductOption = { attribute: "scent", values: [value("lavanda"), value("rosa")] };
const color: ProductOption = { attribute: "color", values: [value("verde")] };

describe("combinations (F-011 CA-1)", () => {
  it("CA-1: a product without attributes has one default combination", () => {
    expect(combinations([])).toEqual([{}]);
    expect(combinations(null)).toEqual([{}]);
  });

  it("CA-1: one attribute gives one combination per value", () => {
    expect(combinations([size])).toEqual([{ size: "50-ml" }, { size: "100-ml" }]);
  });

  it("CA-1: 2 sizes × 2 scents give 4 combinations", () => {
    expect(combinations([size, scent])).toEqual([
      { size: "50-ml", scent: "lavanda" },
      { size: "50-ml", scent: "rosa" },
      { size: "100-ml", scent: "lavanda" },
      { size: "100-ml", scent: "rosa" },
    ]);
  });

  it("CA-1: all three attributes at once", () => {
    expect(combinations([size, scent, color])).toHaveLength(4);
  });

  it("ignores rows without attribute and values without code", () => {
    expect(
      combinations([
        { attribute: null },
        { attribute: "size", values: [{ code: "" }, value("s")] },
      ]),
    ).toEqual([{ size: "s" }]);
    expect(combinations([{ attribute: "size" }])).toEqual([]);
  });
});

describe("combination keys", () => {
  it("does not depend on the order attributes were set in", () => {
    expect(combinationKey({ scent: "rosa", size: "50-ml" })).toBe("size=50-ml|scent=rosa");
    expect(combinationKey({ size: null, color: "" })).toBe("");
  });

  it("valuesOf drops empty values", () => {
    expect(valuesOf({ size: "50-ml", scent: null, color: "" })).toEqual({ size: "50-ml" });
  });
});

describe("missingCombinations (F-011 HU-1)", () => {
  it("returns only the combinations without a variant", () => {
    expect(
      missingCombinations(
        [size, scent],
        [
          { size: "50-ml", scent: "lavanda" },
          { size: "100-ml", scent: "rosa" },
        ],
      ),
    ).toEqual([
      { size: "50-ml", scent: "rosa" },
      { size: "100-ml", scent: "lavanda" },
    ]);
  });

  it("returns nothing for a product without attributes that has its variant", () => {
    expect(missingCombinations([], [{}])).toEqual([]);
  });
});

describe("variantMatchesOptions", () => {
  it("accepts a variant with one valid value per attribute", () => {
    expect(variantMatchesOptions({ size: "50-ml", scent: "rosa" }, [size, scent])).toBe(true);
  });

  it("rejects a missing, unknown or extra value", () => {
    expect(variantMatchesOptions({ size: "50-ml" }, [size, scent])).toBe(false);
    expect(variantMatchesOptions({ size: "30-ml" }, [size])).toBe(false);
    expect(variantMatchesOptions({ size: "50-ml", color: "verde" }, [size])).toBe(false);
  });

  it("a variant without values matches a product without attributes", () => {
    expect(variantMatchesOptions({ size: "" }, null)).toBe(true);
  });
});

describe("affectedByRemoval (F-011 edge case)", () => {
  const variants = [
    { id: 1, size: "50-ml", scent: "lavanda" },
    { id: 2, size: "50-ml", scent: "rosa" },
    { id: 3, size: "100-ml", scent: "rosa" },
  ];

  it("finds the variants that use a removed value", () => {
    const after = [size, { attribute: "scent" as const, values: [value("lavanda")] }];
    expect(affectedByRemoval([size, scent], after, variants).map((v) => v.id)).toEqual([2, 3]);
  });

  it("finds every variant when a whole attribute is removed", () => {
    expect(affectedByRemoval([size, scent], [size], variants)).toHaveLength(3);
  });

  it("does nothing when values are only added", () => {
    const after = [size, { ...scent, values: [...(scent.values ?? []), value("menta")] }];
    expect(affectedByRemoval([size, scent], after, variants)).toEqual([]);
    expect(affectedByRemoval(null, [size], variants)).toEqual([]);
    expect(affectedByRemoval([size], undefined, [{ size: "50-ml" }])).toHaveLength(1);
  });
});

describe("withCodes", () => {
  it("fills empty codes from the Spanish label and keeps existing ones", () => {
    const [option] = withCodes([
      {
        attribute: "scent" as const,
        values: [
          { label: { es: "Flor de azahar" } },
          { code: "rosa", label: { es: "Rosa nueva" } },
          {},
        ],
      },
    ]);
    expect(option?.values?.map((v) => v.code)).toEqual(["flor-de-azahar", "rosa", null]);
    expect(withCodes<ProductOption>([{ attribute: "size" }])[0]?.values).toEqual([]);
  });
});

describe("optionErrors", () => {
  it("accepts a valid list", () => {
    expect(optionErrors([size, scent])).toEqual([]);
    expect(optionErrors(undefined)).toEqual([]);
  });

  it("reports repeated attributes, values without label and repeated values", () => {
    expect(
      optionErrors([
        size,
        { attribute: "size", values: [{ code: null }, value("a"), value("a")] },
        { attribute: null },
        { attribute: "color" },
      ]),
    ).toEqual([
      "El atributo «Tamaño» está repetido.",
      "Cada valor de «Tamaño» necesita una etiqueta en español.",
      "«Tamaño» tiene valores repetidos.",
    ]);
  });
});
