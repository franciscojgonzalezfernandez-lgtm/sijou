import { describe, expect, it } from "vitest";

import { firstParagraph } from "./rich-text";

const doc = (...children: unknown[]) => ({ root: { type: "root", children } });
const p = (...texts: string[]) => ({
  type: "paragraph",
  children: texts.map((text) => ({ type: "text", text })),
});

describe("firstParagraph (F-012 SEO description fallback)", () => {
  it("first paragraph with text, spaces collapsed", () => {
    expect(firstParagraph(doc(p(" "), p("Cremas  y ", "aceites."), p("Otro")))).toBe(
      "Cremas y aceites.",
    );
    expect(firstParagraph(doc({ type: "list", children: [{ children: [{ text: "Uno" }] }] }))).toBe(
      "Uno",
    );
  });

  it("nothing to use", () => {
    expect(firstParagraph(null)).toBeNull();
    expect(firstParagraph({})).toBeNull();
    expect(firstParagraph(doc(p(""), 7, { type: "hr" }))).toBeNull();
  });
});
