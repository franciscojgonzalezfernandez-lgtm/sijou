import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

// F-003 CA-2, CA-3, CA-9: negotiate cookie → Accept-Language → EN and redirect unprefixed paths.
export default createMiddleware(routing);

export const config = {
  // Everything except the admin panel, the API, Next/Vercel internals and files with an extension.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
