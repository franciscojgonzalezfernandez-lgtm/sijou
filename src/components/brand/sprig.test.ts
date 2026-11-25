import { describe, expect, it } from "vitest";

import { LEAVES, sprigIconSvg } from "./sprig";

describe("sprig icon (F-004 CA-10)", () => {
  const svg = sprigIconSvg({ fg: "#33421E", bg: "#F6F4F1", radius: 12 });

  it("is a square SVG on the requested background", () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/);
    expect(svg).toContain('<rect width="64" height="64" rx="12" fill="#F6F4F1"/>');
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("draws the stem and every leaf in the foreground colour", () => {
    expect(svg).toContain('stroke="#33421E"');
    expect(svg.match(/<path d="M0 0/g)).toHaveLength(LEAVES.length);
  });
});
