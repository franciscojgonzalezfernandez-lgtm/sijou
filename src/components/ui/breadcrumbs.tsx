import { Link } from "@/i18n/navigation";

import type { ComponentProps } from "react";

type Href = ComponentProps<typeof Link>["href"];
export type Crumb = { label: string; href?: Href };

/** Trail of links; the last item is the current page (`aria-current="page"`). */
export function Breadcrumbs({ label, items }: { label: string; items: Crumb[] }) {
  return (
    <nav aria-label={label}>
      <ol className="type-body-sm text-ink-muted flex flex-wrap items-center gap-x-2">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-2">
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className="text-ink">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-accent-ink inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {item.label}
                </Link>
              )}
              {!last && (
                <span aria-hidden="true" className="text-ink-muted">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
