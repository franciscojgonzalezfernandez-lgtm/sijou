import { cx } from "@/components/ui/cx";

/** The brand name is a proper noun: the same in every language. */
export const BRAND_NAME = "Maison natur";

/**
 * Serif "M" drawn as paths (thin left stem and right diagonal, thick left diagonal and right
 * stem, as in Garamond). Used for the icon, which cannot rely on web fonts.
 */
export const MARK_PATHS = [
  "M13 14h2.6v35H13z",
  "M13 14h5.6l15.6 33.4-2 3.6z",
  "M31.2 51l1.7-3.4L47.6 14H50z",
  "M45.6 14h6v35h-6z",
  "M8 12.6h10.4v1.8H8zM45.6 12.6H56v1.8H45.6zM8.6 48.4h11.2v1.8H8.6zM41.2 48.4H56v1.8H41.2z",
];

/**
 * Logo (F-004 CA-10). Provisional "Firma" proposal (the brand's current wordmark) until the client
 * chooses one of the four proposals; the final SVG, with outlined letters, replaces the inside of
 * this component without changing its API. Colour comes from `currentColor`.
 */
export function Logo({
  variant = "wordmark",
  className,
  decorative = false,
}: {
  variant?: "wordmark" | "mark";
  className?: string;
  /** True when a link or text next to it already says "Maison natur". */
  decorative?: boolean;
}) {
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": BRAND_NAME } as const);

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 64 64" className={cx("block", className)} fill="currentColor" {...a11y}>
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 72" className={cx("block h-auto", className)} {...a11y}>
      <text
        x="200"
        y="54"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: "var(--font-serif)", fontSize: 64, fontWeight: 500 }}
      >
        {BRAND_NAME}
      </text>
    </svg>
  );
}
