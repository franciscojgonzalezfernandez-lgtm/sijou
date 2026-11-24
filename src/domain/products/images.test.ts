import { describe, expect, it } from "vitest";

import { responsiveImage, sameOriginPath } from "./images";

describe("sameOriginPath", () => {
  it("strips our own origin and keeps other hosts", () => {
    expect(
      sameOriginPath("http://localhost:3000/api/media/file/a.webp", "http://localhost:3000"),
    ).toBe("/api/media/file/a.webp");
    expect(
      sameOriginPath("https://x.blob.vercel-storage.com/a.webp", "http://localhost:3000"),
    ).toBe("https://x.blob.vercel-storage.com/a.webp");
    expect(sameOriginPath("/a.webp", undefined)).toBe("/a.webp");
  });

  it("rewrites every candidate", () => {
    const o = "http://h";
    expect(
      responsiveImage(
        {
          url: `${o}/o.webp`,
          width: 10,
          height: 10,
          sizes: { s: { url: `${o}/s.webp`, width: 5 } },
        },
        o,
      ),
    ).toEqual({ src: "/s.webp", srcSet: "/s.webp 5w, /o.webp 10w", width: 10, height: 10 });
  });
});

describe("responsiveImage (F-010 D-2)", () => {
  it("builds a srcset from generated sizes, smallest first, plus the original", () => {
    expect(
      responsiveImage({
        url: "/o.webp",
        width: 2000,
        height: 1500,
        sizes: {
          w960: { url: "/960.webp", width: 960, height: 720 },
          w480: { url: "/480.webp", width: 480, height: 360 },
          w1440: { url: null, width: null },
          empty: null,
        },
      }),
    ).toEqual({
      src: "/480.webp",
      srcSet: "/480.webp 480w, /960.webp 960w, /o.webp 2000w",
      width: 2000,
      height: 1500,
    });
  });

  it("does not repeat the original when a size already matches it", () => {
    const image = responsiveImage({
      url: "/o.webp",
      width: 480,
      height: 480,
      sizes: { w480: { url: "/480.webp", width: 480 } },
    });
    expect(image?.srcSet).toBe("/480.webp 480w");
  });

  it("falls back to the original without sizes", () => {
    expect(responsiveImage({ url: "/o.webp", width: 300, height: 200 })).toEqual({
      src: "/o.webp",
      srcSet: "/o.webp 300w",
      width: 300,
      height: 200,
    });
  });

  it.each([null, undefined, {}, { url: "/o.webp" }, { url: "/o.webp", width: 10 }])(
    "returns null for %j",
    (media) => {
      expect(responsiveImage(media)).toBeNull();
    },
  );
});
