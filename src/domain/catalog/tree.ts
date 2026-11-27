import { locales, type Locale } from "@/i18n/locales";

/**
 * Category tree rules (F-012 CA-1, CA-5, CA-6). The catalog has tens of categories: it is read
 * whole and every rule runs in memory.
 */
export const MAX_DEPTH = 3;

export const taxonomyStatuses = ["draft", "published", "hidden"] as const;
export type TaxonomyStatus = (typeof taxonomyStatuses)[number];

export const taxonomyStatusLabels: Record<TaxonomyStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  hidden: "Oculta",
};

export type Localized = Partial<Record<Locale, string | null | undefined>>;

export interface CategoryNode {
  id: number;
  parent: number | null;
  position: number;
  status: TaxonomyStatus;
  names: Localized;
  slugs: Localized;
}

export type CategoryTree = ReadonlyMap<number, CategoryNode>;

export function buildTree(nodes: readonly CategoryNode[]): CategoryTree {
  return new Map(nodes.map((node) => [node.id, node]));
}

/** Ancestors from the parent up to the root. Stops on a broken or cyclic link. */
function ancestors(tree: CategoryTree, id: number): CategoryNode[] {
  const result: CategoryNode[] = [];
  const seen = new Set([id]);
  let parent = tree.get(id)?.parent ?? null;
  while (parent !== null && !seen.has(parent)) {
    const node = tree.get(parent);
    if (!node) break;
    result.push(node);
    seen.add(parent);
    parent = node.parent;
  }
  return result;
}

/** 1 for a root category. */
export function depthOf(tree: CategoryTree, id: number): number {
  return ancestors(tree, id).length + 1;
}

/** Children ordered by position, then by Spanish name. */
export function childrenOf(tree: CategoryTree, id: number | null): CategoryNode[] {
  return [...tree.values()]
    .filter((node) => node.parent === id && node.id !== id)
    .sort((a, b) => a.position - b.position || (a.names.es ?? "").localeCompare(b.names.es ?? ""));
}

/** 1 for a leaf: the levels a category and its descendants take up. */
export function subtreeHeight(tree: CategoryTree, id: number, seen = new Set<number>()): number {
  seen.add(id);
  const heights = childrenOf(tree, id)
    .filter((child) => !seen.has(child.id))
    .map((child) => subtreeHeight(tree, child.id, seen));
  return 1 + Math.max(0, ...heights);
}

export function isDescendant(tree: CategoryTree, id: number, candidate: number): boolean {
  return ancestors(tree, candidate).some((node) => node.id === id);
}

export type ParentProblem = "self" | "descendant" | "tooDeep" | "notFound";

/**
 * Whether `id` (an existing category, or `null` for a new one) can sit under `parent`.
 * Moving a category moves its whole branch, so its descendants count towards the depth.
 */
export function validateParent(
  tree: CategoryTree,
  id: number | null,
  parent: number | null,
): ParentProblem | null {
  if (parent === null) {
    return id !== null && subtreeHeight(tree, id) > MAX_DEPTH ? "tooDeep" : null;
  }
  if (!tree.has(parent)) return "notFound";
  if (id !== null && parent === id) return "self";
  if (id !== null && isDescendant(tree, id, parent)) return "descendant";
  const height = id !== null && tree.has(id) ? subtreeHeight(tree, id) : 1;
  return depthOf(tree, parent) + height > MAX_DEPTH ? "tooDeep" : null;
}

export const parentProblemMessages: Record<ParentProblem, string> = {
  self: "No puede estar dentro de sí misma ni de una de sus subcategorías.",
  descendant: "No puede estar dentro de sí misma ni de una de sus subcategorías.",
  tooDeep: `Máximo ${MAX_DEPTH} niveles: con sus subcategorías quedaría por debajo del nivel ${MAX_DEPTH}.`,
  notFound: "La categoría superior no existe.",
};

export interface Crumb {
  id: number;
  name: string;
  /** Slugs from the root to this category, in one language. */
  path: string[];
}

/** From the root to the category, in one language. Empty if a level lacks that language. */
export function buildBreadcrumbs(tree: CategoryTree, id: number, locale: Locale): Crumb[] {
  const node = tree.get(id);
  if (!node) return [];
  const chain = [...ancestors(tree, id).reverse(), node];
  const crumbs: Crumb[] = [];
  for (const level of chain) {
    const name = level.names[locale];
    const slug = level.slugs[locale];
    if (!name || !slug) return [];
    crumbs.push({ id: level.id, name, path: [...(crumbs.at(-1)?.path ?? []), slug] });
  }
  return crumbs;
}

/** "Rostro › Cremas › Noche", for the admin list (Spanish, falling back to the id). */
export function breadcrumbLabel(tree: CategoryTree, id: number): string {
  const node = tree.get(id);
  if (!node) return "";
  return [...ancestors(tree, id).reverse(), node]
    .map((level) => level.names.es ?? `#${level.id}`)
    .join(" › ");
}

/** The category whose slug path matches exactly, level by level. */
export function resolveCategoryPath(
  tree: CategoryTree,
  locale: Locale,
  segments: readonly string[],
): CategoryNode | null {
  let parent: number | null = null;
  let found: CategoryNode | null = null;
  for (const segment of segments) {
    found = childrenOf(tree, parent).find((node) => node.slugs[locale] === segment) ?? null;
    if (!found) return null;
    parent = found.id;
  }
  return found;
}

function hasLanguage(node: CategoryNode, locale: Locale): boolean {
  return Boolean(node.names[locale]?.trim() && node.slugs[locale]?.trim());
}

/** CA-6: published, in that language, and so is every ancestor. Hiding one hides its branch. */
export function isCategoryVisible(tree: CategoryTree, id: number, locale: Locale): boolean {
  const node = tree.get(id);
  if (!node) return false;
  return [node, ...ancestors(tree, id)].every(
    (level) => level.status === "published" && hasLanguage(level, locale),
  );
}

/** CA-5: products whose only category is the one about to be deleted. */
export function productsLeftWithoutCategory<T extends { categories: readonly number[] }>(
  products: readonly T[],
  categoryId: number,
): T[] {
  return products.filter(
    (product) => product.categories.length > 0 && product.categories.every((c) => c === categoryId),
  );
}

/** First path segments of the shop's fixed pages in one language (`products`, `katalog`…). */
export function reservedSegments(
  pathnames: Record<string, string | Partial<Record<Locale, string>>>,
  locale: Locale,
): Set<string> {
  const segments = new Set<string>();
  for (const value of Object.values(pathnames)) {
    const path = typeof value === "string" ? value : value[locale];
    const first = path?.split("/").find(Boolean);
    if (first && !first.startsWith("[")) segments.add(first);
  }
  return segments;
}

/** Locales in which a root slug would hide a fixed page of the shop. */
export function reservedSlugLocales(
  pathnames: Record<string, string | Partial<Record<Locale, string>>>,
  slugs: Localized,
): Locale[] {
  return locales.filter((locale) => {
    const slug = slugs[locale];
    return Boolean(slug) && reservedSegments(pathnames, locale).has(slug as string);
  });
}
