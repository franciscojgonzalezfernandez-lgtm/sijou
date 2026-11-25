import type { ButtonHTMLAttributes } from "react";

import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  // One primary action per view (F-004 plan). Text on olive measures 7.65:1 (AAA).
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-control bg-raised text-ink hover:bg-surface-hover",
  ghost: "text-accent-ink underline-offset-4 hover:bg-subtle hover:underline",
  danger: "bg-danger text-on-accent hover:brightness-90",
};

/** Classes shared by buttons and links that look like buttons. 44px tall (CA-4). */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
  return cx(
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-5 py-2",
    "font-sans text-base font-medium leading-tight transition-colors duration-(--duration-fast) ease-(--ease-out)",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    "forced-colors:border forced-colors:border-[ButtonText]",
    VARIANTS[variant],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Shows a busy state: the button keeps focus and its name, and ignores clicks. */
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  type = "button",
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={buttonClasses(variant, className)}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
