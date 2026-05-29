import { clerkMiddleware } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { NextResponse } from "next/server";

const LOCALES = ["de", "en"] as const;
const DEFAULT_LOCALE = "de";

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();
  const { pathname } = req.nextUrl;

  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const lang = LOCALES.includes(maybeLocale as any)
    ? (maybeLocale as (typeof LOCALES)[number])
    : null;

  const hasLocalePrefix = lang !== null;

  // Do not run locale/auth page redirects for API routes and REST handlers
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/play-areas") ||
    pathname.startsWith("/trpc") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // If no locale prefix, redirect to default locale.
  if (!hasLocalePrefix) {
    const fallbackLang =
      req.cookies.get("NEXT_LANG")?.value && LOCALES.includes(req.cookies.get("NEXT_LANG")!.value as any)
        ? (req.cookies.get("NEXT_LANG")!.value as (typeof LOCALES)[number])
        : DEFAULT_LOCALE;

    const url = req.nextUrl.clone();
    url.pathname = `/${fallbackLang}${pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set("NEXT_LANG", fallbackLang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Set cookie for SSR components
  const resNext = NextResponse.next();
  resNext.cookies.set("NEXT_LANG", lang!, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  const pathWithoutLocale = pathname.replace(`/${lang}`, "") || "/";

  if (pathWithoutLocale.startsWith("/sign-in")) {
    return resNext;
  }

  if (!userId) {
    const url = new URL(`/${lang}/sign-in`, req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set("NEXT_LANG", lang!, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  for (const [routePattern, allowedRoles] of Object.entries(routeAccessMap)) {
    // routePattern is already a regex-ish path string like "/admin(.*)"
    const regex = new RegExp(`^${routePattern}`);
    if (regex.test(pathWithoutLocale) && role && !allowedRoles.includes(role)) {
      const url = new URL(`/${lang}/${role}`, req.url);
      const res = NextResponse.redirect(url);
      res.cookies.set("NEXT_LANG", lang!, { path: "/", maxAge: 60 * 60 * 24 * 365 });
      return res;
    }
  }

  return resNext;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|svg|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};