import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");

/** Custom properties of the first `:root` block (the base values, before media queries). */
function rootTokens(source: string): Map<string, string> {
  const block = /:root\s*\{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(name!, value!.trim());
  }
  return tokens;
}

const tokens = rootTokens(css);

/** Follows var() references down to a literal value. */
function resolve(name: string, seen: string[] = []): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`Unknown token ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (!ref) return value;
  if (seen.includes(ref[1]!)) throw new Error(`Circular token ${name}`);
  return resolve(ref[1]!, [...seen, name]);
}

/** WCAG 2.2 relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channels = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!channels) throw new Error(`Not a hex colour: ${hex}`);
  const [r, g, b] = channels.slice(1).map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// The measured pairs of the F-004 plan: [foreground, background, minimum].
const PAIRS: Array<[string, string, number]> = [
  ["border-control", "bg-page", 3],
  ["border-control", "bg-surface", 3],
  ["text-primary", "bg-page", 7],
  ["text-primary", "bg-surface-hover", 7],
  ["text-primary", "bg-raised", 7],
  ["text-secondary", "bg-page", 4.5],
  ["text-secondary", "bg-surface-hover", 4.5],
  ["text-secondary", "bg-raised", 4.5],
  ["brand", "bg-page", 7],
  ["brand", "bg-surface", 7],
  ["accent-solid", "bg-page", 3],
  ["text-on-accent", "accent-solid", 7],
  ["text-on-accent", "accent-solid-hover", 7],
  ["text-primary", "accent-subtle", 7],
  ["accent-text", "bg-page", 4.5],
  ["accent-text", "bg-surface", 4.5],
  ["accent-text", "bg-raised", 4.5],
  ["text-on-accent", "earth-solid", 4.5],
  ["text-on-accent", "earth-solid-hover", 4.5],
  ["earth-text", "earth-subtle", 4.5],
  ["earth-text", "bg-page", 4.5],
  ["earth-text", "bg-surface", 4.5],
  ["focus-ring", "bg-page", 3],
  ["focus-ring", "bg-surface", 3],
  ["focus-ring", "bg-raised", 3],
  ["danger-text", "bg-page", 4.5],
  ["danger-text", "danger-subtle", 4.5],
  ["text-on-accent", "danger-solid", 4.5],
  ["success-text", "bg-page", 4.5],
  ["success-text", "success-subtle", 4.5],
  ["warning-text", "bg-page", 4.5],
  ["warning-text", "warning-subtle", 4.5],
];

describe("design tokens", () => {
  it("CA-1: every semantic colour resolves to a literal hex colour", () => {
    for (const name of tokens.keys()) {
      if (!name.startsWith("--color-")) continue;
      expect(resolve(name), name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("contrast() matches the WCAG reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it.each(PAIRS)("CA-2: %s on %s reaches %s:1", (fg, bg, min) => {
    const ratio = contrast(resolve(`--color-${fg}`), resolve(`--color-${bg}`));
    expect(ratio).toBeGreaterThanOrEqual(min);
  });

  it("CA-2: body text (text-primary) is AAA on every page background", () => {
    for (const bg of ["bg-page", "bg-subtle", "bg-surface", "bg-surface-hover", "bg-raised"]) {
      expect(
        contrast(resolve("--color-text-primary"), resolve(`--color-${bg}`)),
        bg,
      ).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("type scale", () => {
  const px = (value: string) => {
    // clamp(min, preferred, max): the smallest size is the first argument.
    const first = /^clamp\(([^,]+),/.exec(value)?.[1] ?? value;
    const rem = /^([\d.]+)rem$/.exec(first.trim());
    if (!rem) throw new Error(`Unexpected size ${value}`);
    return Number(rem[1]) * 16;
  };

  it.each(["display", "title", "subtitle"])("the serif never goes below 28px (%s)", (step) => {
    expect(px(resolve(`--type-${step}-size`))).toBeGreaterThanOrEqual(28);
  });

  it("body text is 16px, so iOS does not zoom into fields", () => {
    expect(px(resolve("--type-body-size"))).toBe(16);
  });
});
