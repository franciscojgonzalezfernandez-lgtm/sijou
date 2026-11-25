import { cx } from "./cx";

/**
 * Placeholder block. Hidden from assistive tech: the container that is loading carries
 * `aria-busy="true"` and a text alternative. The pulse stops with reduced motion (CA-7).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("bg-surface animate-pulse rounded-md motion-reduce:animate-none", className)}
    />
  );
}
