import { locale } from "next/root-params";

type RootLocaleGetter = () => Promise<string | undefined>;

/**
 * The `[locale]` root param. `next typegen` does not detect it when the app has two root layouts
 * ((frontend)/[locale] and (payload)), so `next/root-params` is untyped; this gives it its shape.
 */
export const getRootLocale = locale as unknown as RootLocaleGetter;
