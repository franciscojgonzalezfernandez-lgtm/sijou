import type { ReactNode } from "react";

import { cx } from "./cx";

export type BadgeTone = "neutral" | "olive" | "earth" | "danger" | "success" | "warning";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface text-ink",
  olive: "bg-accent-soft text-ink",
  earth: "bg-earth-soft text-earth-ink",
  danger: "bg-danger-soft text-danger-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
};

/** Small label. Always carries text: colour never carries the meaning on its own. */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "type-label inline-flex items-center rounded-sm px-2 py-1 forced-colors:border",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
