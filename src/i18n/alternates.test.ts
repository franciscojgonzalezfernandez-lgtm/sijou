import { describe, expect, it } from "vitest";

import { buildAlternates } from "./alternates";

const paths = { en: "/en/face-cream", de: "/de/gesichtscreme", es: "/es/crema-facial" };

describe("buildAlternates", () => {
  it("CA-5: lists every language plus x-default pointing to English", () => {
    expect(buildAlternates("de", paths)?.languages).toEqual({
      en: "/en/face-cream",
      de: "/de/gesichtscreme",
      es: "/es/crema-facial",
      "x-default": "/en/face-cream",
    });
  });

  it("CA-5: the canonical URL is the page's own language", () => {
    expect(buildAlternates("es", paths)?.canonical).toBe("/es/crema-facial");
  });
});
