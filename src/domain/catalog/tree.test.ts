import { describe, expect, it } from "vitest";

import {
  breadcrumbLabel,
  buildBreadcrumbs,
  buildTree,
  type CategoryNode,
  childrenOf,
  depthOf,
  isCategoryVisible,
  MAX_DEPTH,
  parentProblemMessages,
  productsLeftWithoutCategory,
  reservedSegments,
  reservedSlugLocales,
  resolveCategoryPath,
  subtreeHeight,
  validateParent,
} from "./tree";

function node(
  id: number,
  parent: number | null,
  es: string,
  extra: Partial<CategoryNode> = {},
): CategoryNode {
  const slug = es.toLowerCase();
  return {
    id,
    parent,
    position: 0,
    status: "published",
    names: { es, en: `${es} EN`, de: `${es} DE` },
    slugs: { es: slug, en: `${slug}-en`, de: `${slug}-de` },
    ...extra,
  };
}

// Rostro › Cremas › Noche; Cuerpo › Aceites
const tree = buildTree([
  node(1, null, "Rostro"),
  node(2, 1, "Cremas"),
  node(3, 2, "Noche"),
  node(4, null, "Cuerpo", { position: -1 }),
  node(5, 4, "Aceites"),
]);

describe("category tree (F-012 CA-1)", () => {
  it("depth and height", () => {
    expect(depthOf(tree, 1)).toBe(1);
    expect(depthOf(tree, 3)).toBe(3);
    expect(subtreeHeight(tree, 1)).toBe(3);
    expect(subtreeHeight(tree, 3)).toBe(1);
    expect(MAX_DEPTH).toBe(3);
  });

  it("children by position, then by Spanish name", () => {
    expect(childrenOf(tree, null).map((n) => n.id)).toEqual([4, 1]);
    const ties = buildTree([
      node(1, null, "B"),
      node(2, null, "A"),
      node(3, null, "C", { names: {} }),
    ]);
    expect(childrenOf(ties, null).map((n) => n.id)).toEqual([3, 2, 1]);
    const unnamed = buildTree([
      node(1, null, "A", { names: {} }),
      node(2, null, "B", { names: {} }),
    ]);
    expect(childrenOf(unnamed, null)).toHaveLength(2);
  });

  it("validateParent: roots, level 2 and 3 are fine", () => {
    expect(validateParent(tree, null, null)).toBeNull();
    expect(validateParent(tree, null, 1)).toBeNull();
    expect(validateParent(tree, null, 2)).toBeNull();
    expect(validateParent(tree, 2, null)).toBeNull();
    expect(validateParent(tree, 3, 1)).toBeNull();
  });

  it("validateParent: a fourth level is rejected, counting the branch moved", () => {
    expect(validateParent(tree, null, 3)).toBe("tooDeep");
    // Cuerpo › Aceites (2 levels) under Cremas (level 2) would reach level 4.
    expect(validateParent(tree, 4, 2)).toBe("tooDeep");
    expect(validateParent(tree, 4, 1)).toBeNull(); // reaches exactly level 3
    expect(validateParent(tree, 5, 2)).toBeNull();
  });

  it("validateParent: itself, a child or a grandchild (edge case), or a missing parent", () => {
    expect(validateParent(tree, 1, 1)).toBe("self");
    expect(validateParent(tree, 1, 2)).toBe("descendant");
    expect(validateParent(tree, 1, 3)).toBe("descendant");
    expect(validateParent(tree, 1, 99)).toBe("notFound");
    expect(parentProblemMessages.tooDeep).toContain("3 niveles");
  });

  it("an already too deep branch cannot become a root either", () => {
    const deep = buildTree([node(1, null, "A"), node(2, 1, "B"), node(3, 2, "C"), node(4, 3, "D")]);
    expect(validateParent(deep, 1, null)).toBe("tooDeep");
  });

  it("broken and cyclic links do not loop", () => {
    const broken = buildTree([node(1, 99, "A"), node(2, 3, "B"), node(3, 2, "C")]);
    expect(depthOf(broken, 1)).toBe(1);
    expect(depthOf(broken, 2)).toBe(2);
    expect(subtreeHeight(broken, 2)).toBe(2);
    const selfLoop = buildTree([node(1, 1, "A")]);
    expect(childrenOf(selfLoop, 1)).toEqual([]);
  });
});

describe("breadcrumbs and paths (F-012 CA-1)", () => {
  it.each([
    ["es", ["rostro", "cremas", "noche"], "Noche"],
    ["en", ["rostro-en", "cremas-en", "noche-en"], "Noche EN"],
    ["de", ["rostro-de", "cremas-de", "noche-de"], "Noche DE"],
  ] as const)("in %s", (locale, path, name) => {
    const crumbs = buildBreadcrumbs(tree, 3, locale);
    expect(crumbs.map((c) => c.path.at(-1))).toEqual(path);
    expect(crumbs.at(-1)).toEqual({ id: 3, name, path });
    expect(resolveCategoryPath(tree, locale, path)?.id).toBe(3);
  });

  it("partial paths, slugs at another level and other languages do not resolve", () => {
    expect(resolveCategoryPath(tree, "es", ["rostro", "cremas"])?.id).toBe(2);
    expect(resolveCategoryPath(tree, "es", ["cremas"])).toBeNull();
    expect(resolveCategoryPath(tree, "es", ["rostro", "noche"])).toBeNull();
    expect(resolveCategoryPath(tree, "en", ["rostro"])).toBeNull();
    expect(resolveCategoryPath(tree, "es", [])).toBeNull();
  });

  it("no breadcrumbs when a level lacks the language or the category is unknown", () => {
    const partial = buildTree([
      node(1, null, "Rostro", { slugs: { es: "rostro" } }),
      node(2, 1, "Cremas"),
    ]);
    expect(buildBreadcrumbs(partial, 2, "en")).toEqual([]);
    expect(buildBreadcrumbs(tree, 99, "es")).toEqual([]);
  });

  it("admin label", () => {
    expect(breadcrumbLabel(tree, 3)).toBe("Rostro › Cremas › Noche");
    expect(breadcrumbLabel(buildTree([node(1, null, "A", { names: {} })]), 1)).toBe("#1");
    expect(breadcrumbLabel(tree, 99)).toBe("");
  });
});

describe("visibility (F-012 CA-6)", () => {
  it("published, in the language, with every ancestor visible", () => {
    expect(isCategoryVisible(tree, 3, "de")).toBe(true);
    for (const status of ["draft", "hidden"] as const) {
      const t = buildTree([node(1, null, "Rostro", { status }), node(2, 1, "Cremas")]);
      expect(isCategoryVisible(t, 1, "es")).toBe(false);
      expect(isCategoryVisible(t, 2, "es")).toBe(false);
    }
    const noGerman = buildTree([node(1, null, "Rostro", { names: { es: "Rostro" } })]);
    expect(isCategoryVisible(noGerman, 1, "de")).toBe(false);
    expect(isCategoryVisible(tree, 99, "es")).toBe(false);
  });
});

describe("deleting (F-012 CA-5)", () => {
  it("products whose only category is the deleted one", () => {
    const products = [
      { id: 1, categories: [3] },
      { id: 2, categories: [3, 5] },
      { id: 3, categories: [] },
      { id: 4, categories: [5] },
    ];
    expect(productsLeftWithoutCategory(products, 3).map((p) => p.id)).toEqual([1]);
  });
});

describe("reserved slugs", () => {
  const pathnames = {
    "/": "/",
    "/catalog": { en: "/catalog", de: "/katalog", es: "/catalogo" },
    "/products/[slug]": { en: "/products/[slug]", de: "/produkte/[slug]", es: "/productos/[slug]" },
    "/[...path]": "/[...path]",
    "/x": {},
  };

  it("first segments of fixed pages in each language", () => {
    expect([...reservedSegments(pathnames, "de")].sort()).toEqual(["katalog", "produkte"]);
    expect(
      reservedSlugLocales(pathnames, { es: "productos", en: "products", de: "pflege" }),
    ).toEqual(["en", "es"]);
    expect(reservedSlugLocales(pathnames, { es: "rostro", en: null })).toEqual([]);
  });
});
