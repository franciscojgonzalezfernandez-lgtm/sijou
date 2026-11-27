import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import messages from "../messages/en.json";
import { defaultLocale, isLocale } from "./i18n/locales";
import { routing } from "./i18n/routing";

// F-003 CA-2, CA-3, CA-9: negotiate cookie → Accept-Language → EN and redirect unprefixed paths.
const intl = createMiddleware(routing);

// A language code we do not serve (`/fr`, `/pt-br/…`).
const LANGUAGE_PREFIX = /^[a-z]{2}(-[a-z]{2,4})?$/i;

/** A small 404 page in the default language, from the same messages as the shop's own. */
function notFoundPage(): NextResponse {
  const { title, description, backHome } = messages.NotFound;
  const html = `<!doctype html><html lang="${defaultLocale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><main><h1>${title}</h1><p>${description}</p><p><a href="/${defaultLocale}">${backHome}</a></p></main></body></html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

export default function proxy(request: NextRequest) {
  const first = request.nextUrl.pathname.split("/")[1] ?? "";
  // F-003: an unsupported language answers 404 at once. Redirected to `/en/fr`, it would reach the
  // category route (F-012), whose not-found page streams with a 200 on its first visit.
  if (LANGUAGE_PREFIX.test(first) && !isLocale(first)) return notFoundPage();
  return intl(request);
}

export const config = {
  // Everything except the admin panel, the API, Next/Vercel internals, files with an extension and
  // the generated icons (F-004 CA-10), which have no extension in their URL.
  matcher: ["/((?!api|admin|_next|_vercel|icon|apple-icon|.*\\..*).*)"],
};
