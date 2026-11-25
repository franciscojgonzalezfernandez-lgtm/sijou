/**
 * Olive sprig of the "Rama" logo (chosen by the client on 25-11-2026), in a 60×124 box.
 * One source for the logo component, the favicon and the app icon.
 */
export const SPRIG_BOX = { width: 60, height: 124 } as const;

export const SPRIG_STEM = "M29 122 C25 96 35 66 31 38 C30 26 32 14 35 4";

/** A narrow olive leaf pointing along +x, 20 units long. */
export const LEAF = "M0 0 C5 -3.6 13 -3.9 20 0 C13 3.9 5 3.6 0 0Z";

/** [x, y, rotation in degrees, scale] of each leaf, from the base up; they alternate sides. */
export const LEAVES: ReadonlyArray<readonly [number, number, number, number]> = [
  [28, 102, -150, 1.15],
  [30, 92, -28, 1.1],
  [32, 76, -154, 1.05],
  [33, 64, -30, 1],
  [32, 48, -148, 0.95],
  [31, 36, -34, 0.88],
  [32, 22, -140, 0.78],
  [35, 5, -72, 0.72],
];

export const leafTransform = ([x, y, r, s]: readonly [number, number, number, number]) =>
  `translate(${x} ${y}) rotate(${r}) scale(${s})`;

/**
 * Standalone SVG of the sprig on a square tile, for icons. The stem is drawn thicker than in the
 * logo so it survives at 16px, and the sprig leans to fill the square.
 */
export function sprigIconSvg({
  fg,
  bg,
  radius,
}: {
  fg: string;
  bg: string;
  radius: number;
}): string {
  const leaves = LEAVES.map(
    (leaf) => `<path d="${LEAF}" transform="${leafTransform(leaf)}"/>`,
  ).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="${radius}" fill="${bg}"/>` +
    `<g fill="${fg}" transform="translate(32 33) rotate(24) scale(0.46) translate(-31 -63)">` +
    `<path d="${SPRIG_STEM}" fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>` +
    `${leaves}</g></svg>`
  );
}
