/** Plain text of the first non-empty paragraph of a Lexical document (F-012 SEO fallback). */
export function firstParagraph(doc: unknown): string | null {
  const root = (doc as { root?: { children?: unknown } } | null | undefined)?.root;
  const blocks = Array.isArray(root?.children) ? (root.children as unknown[]) : [];
  for (const block of blocks) {
    const text = textOf(block).replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return null;
}

function textOf(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  const { text, children } = node as { text?: unknown; children?: unknown };
  if (typeof text === "string") return text;
  return Array.isArray(children) ? children.map(textOf).join("") : "";
}
