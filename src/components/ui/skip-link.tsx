/** First focusable element of every page: jumps to `#main`. Hidden until it has focus. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="focus:bg-accent focus:text-on-accent sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:px-4"
    >
      {label}
    </a>
  );
}
