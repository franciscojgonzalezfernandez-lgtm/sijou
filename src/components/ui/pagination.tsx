import { cx } from "./cx";

export type PaginationLabels = {
  /** Name of the navigation landmark, e.g. "Páginas". */
  nav: string;
  previous: string;
  next: string;
  /** Accessible name of a page link, e.g. (3) => "Página 3". */
  page: (page: number) => string;
};

const item =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 font-sans text-base tabular";

/** Real links (crawlable, F-025); the current page is marked with `aria-current="page"`. */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  labels,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  labels: PaginationLabels;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav aria-label={labels.nav}>
      <ul className="flex flex-wrap items-center gap-1">
        {page > 1 && (
          <li>
            <a
              href={hrefFor(page - 1)}
              rel="prev"
              className={cx(item, "text-accent-ink underline underline-offset-4")}
            >
              {labels.previous}
            </a>
          </li>
        )}
        {pages.map((n) => (
          <li key={n}>
            <a
              href={hrefFor(n)}
              aria-label={labels.page(n)}
              aria-current={n === page ? "page" : undefined}
              className={cx(
                item,
                n === page
                  ? "bg-accent text-on-accent"
                  : "text-accent-ink hover:bg-subtle underline underline-offset-4",
              )}
            >
              {n}
            </a>
          </li>
        ))}
        {page < pageCount && (
          <li>
            <a
              href={hrefFor(page + 1)}
              rel="next"
              className={cx(item, "text-accent-ink underline underline-offset-4")}
            >
              {labels.next}
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
