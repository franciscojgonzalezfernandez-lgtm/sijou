import { describe, expect, it } from "vitest";

import { isValidGtin } from "./ean";
import { imagesForVariant, mainImage, MAX_PHOTOS, TOO_MANY_PHOTOS } from "./gallery";
import { normalizeSku, suggestSku } from "./sku";
import { isValidCompareAtPrice, isValidNetQuantity, unitPrice } from "./unit-price";

describe("SKU (F-011 CA-2)", () => {
  it("CA-2: normalizes case and spaces so uniqueness does not depend on them", () => {
    expect(normalizeSku("  cr 50--ml ")).toBe("CR-50-ML");
  });

  it("CA-2: suggests a SKU from the product slug and values", () => {
    expect(suggestSku("crema-de-manos", { size: "50-ml", scent: "lavanda" }, new Set())).toBe(
      "CREMA-DE-MANOS-50-ML-LAVANDA",
    );
  });

  it("CA-2: adds a number when the SKU is taken", () => {
    const taken = new Set(["CREME-ROSA", "CREME-ROSA-2"]);
    expect(suggestSku("Crème", { scent: "rosa" }, taken)).toBe("CREME-ROSA-3");
  });

  it("falls back when there is nothing to build it from", () => {
    expect(suggestSku("", {}, new Set())).toBe("SKU");
  });
});

describe("EAN / GTIN (F-011 CA-2)", () => {
  it.each(["4006381333931", "96385074", "036000291452", "10012345678902"])("accepts %s", (code) => {
    expect(isValidGtin(code)).toBe(true);
  });

  it.each(["4006381333932", "1234567", "40063813339a1", "123456789"])("rejects %s", (code) => {
    expect(isValidGtin(code)).toBe(false);
  });
});

describe("prices and net quantity (F-011 CA-2)", () => {
  it("CA-2: the reference price is optional and higher than the price", () => {
    expect(isValidCompareAtPrice(20, null)).toBe(true);
    expect(isValidCompareAtPrice(20, undefined)).toBe(true);
    expect(isValidCompareAtPrice(20, 25)).toBe(true);
    expect(isValidCompareAtPrice(20, 20)).toBe(false);
    expect(isValidCompareAtPrice(null, 20)).toBe(false);
  });

  it("CA-2: net quantity and unit go together", () => {
    expect(isValidNetQuantity(null, null)).toBe(true);
    expect(isValidNetQuantity(undefined, undefined)).toBe(true);
    expect(isValidNetQuantity(50, "ml")).toBe(true);
    expect(isValidNetQuantity(50, null)).toBe(false);
    expect(isValidNetQuantity(null, "g")).toBe(false);
    expect(isValidNetQuantity(0, "g")).toBe(false);
    expect(isValidNetQuantity(Number.NaN, "g")).toBe(false);
  });

  it("CA-2: price per 100 ml or 100 g, rounded to the Rappen", () => {
    expect(unitPrice(24.9, 50, "ml")).toEqual({ rappen: 4980, per: "100 ml" });
    expect(unitPrice(9.9, 30, "g")).toEqual({ rappen: 3300, per: "100 g" });
    expect(unitPrice(10, 3, "g")).toEqual({ rappen: 33333, per: "100 g" });
  });

  it("has no unit price without a valid net quantity", () => {
    expect(unitPrice(10, null, "ml")).toBeNull();
    expect(unitPrice(10, 50, null)).toBeNull();
    expect(unitPrice(10, -5, "ml")).toBeNull();
  });
});

describe("gallery (F-011 CA-4, CA-5)", () => {
  const gallery = [
    { image: "a", variants: [] },
    { image: "b", variants: [1, 2] },
    { image: "c", variants: ["3"] },
    { image: "e", variants: [{ id: 4 }] },
    { image: "d", variants: null },
  ];

  it("CA-4: at most 10 photos, with a message", () => {
    expect(MAX_PHOTOS).toBe(10);
    expect(TOO_MANY_PHOTOS).toBe("Máximo 10 fotos por producto.");
  });

  it("CA-5: the first photo is the main one", () => {
    expect(mainImage(gallery)).toBe("a");
    expect(mainImage([])).toBeNull();
    expect(mainImage(null)).toBeNull();
  });

  it("CA-5: a variant shows its own photos plus the shared ones", () => {
    expect(imagesForVariant(gallery, 2)).toEqual(["a", "b", "d"]);
    expect(imagesForVariant(gallery, "4")).toEqual(["a", "e", "d"]);
    expect(imagesForVariant(gallery, 3)).toEqual(["a", "c", "d"]);
  });

  it("CA-5: a variant without photos of its own shows them all", () => {
    expect(imagesForVariant([{ image: "x", variants: [1] }], 9)).toEqual(["x"]);
    expect(imagesForVariant(undefined, 1)).toEqual([]);
  });
});
