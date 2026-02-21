import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - api (Next.js API routes)
    // - _next (Next.js internals)
    // - _vercel (Vercel internals)
    // - All files with an extension (e.g. favicon.ico)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
