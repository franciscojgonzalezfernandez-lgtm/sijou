import { cx } from "@/components/ui/cx";

import { LEAF, LEAVES, leafTransform, SPRIG_BOX, SPRIG_STEM } from "./sprig";

/** The brand name: a proper noun, the same in every language, always with the circumflex. */
export const BRAND_NAME = "Sijôu";

// Cormorant Garamond 500 at 88 units: "Sijôu" measures 176.5 units wide; the j descends 25 below
// the baseline.
const WORD = { size: 88, width: 177 } as const;

function Sprig({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="currentColor">
      <path
        d={SPRIG_STEM}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {LEAVES.map((leaf) => (
        <path key={leaf.join()} d={LEAF} transform={leafTransform(leaf)} />
      ))}
    </g>
  );
}

function Word({ x, y, anchor }: { x: number; y: number; anchor: "start" | "middle" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill="currentColor"
      style={{ fontFamily: "var(--font-serif)", fontSize: WORD.size, fontWeight: 500 }}
    >
      {BRAND_NAME}
    </text>
  );
}

export type LogoVariant = "horizontal" | "stacked" | "mark";

/**
 * Logo (F-004 CA-10): the "Rama" proposal, an olive sprig with the name in Cormorant Garamond.
 * `horizontal` for the header, `stacked` for large spaces, `mark` (sprig only) for icons.
 * Colour comes from `currentColor`: forest green on linen, linen on olive.
 */
export function Logo({
  variant = "horizontal",
  className,
  decorative = false,
}: {
  variant?: LogoVariant;
  className?: string;
  /** True when a link or text next to it already says the brand name. */
  decorative?: boolean;
}) {
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": BRAND_NAME } as const);
  const gap = 16;

  if (variant === "mark") {
    return (
      <svg
        viewBox={`0 0 ${SPRIG_BOX.width} ${SPRIG_BOX.height}`}
        className={cx("block", className)}
        {...a11y}
      >
        <Sprig />
      </svg>
    );
  }
  if (variant === "stacked") {
    const width = WORD.width + 8;
    return (
      <svg viewBox={`0 0 ${width} 234`} className={cx("block", className)} {...a11y}>
        <Sprig x={(width - SPRIG_BOX.width) / 2} />
        <Word x={width / 2} y={124 + gap + 64} anchor="middle" />
      </svg>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${SPRIG_BOX.width + gap + WORD.width + 4} ${SPRIG_BOX.height}`}
      className={cx("block", className)}
      {...a11y}
    >
      <Sprig />
      <Word x={SPRIG_BOX.width + gap} y={90} anchor="start" />
    </svg>
  );
}
