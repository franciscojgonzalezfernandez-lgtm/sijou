import type { ComponentProps } from "react";

import { Link as IntlLink } from "@/i18n/navigation";

import { cx } from "./cx";

type IntlLinkProps = ComponentProps<typeof IntlLink>;

export type LinkProps = IntlLinkProps & {
  /** `inline`: inside running text, always underlined. `nav`: navigation, underlined on hover. */
  variant?: "inline" | "nav";
  /** Marks the link to the current page (`aria-current="page"`). */
  current?: boolean;
};

/** Localised link (next-intl). Navigation targets are at least 44px tall (CA-4). */
export function Link({ variant = "inline", current = false, className, ...rest }: LinkProps) {
  return (
    <IntlLink
      aria-current={current ? "page" : undefined}
      className={cx(
        "text-accent-ink decoration-1 underline-offset-4",
        variant === "inline"
          ? "underline hover:decoration-2"
          : "aria-[current=page]:text-ink inline-flex min-h-11 items-center hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline",
        className,
      )}
      {...rest}
    />
  );
}
