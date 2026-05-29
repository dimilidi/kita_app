import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  accessDeniedRedirectPath,
  defaultHomePath,
  evaluateRouteAccess,
  resolveRoleFromClaims,
} from "@/lib/routeAccess";
import { NextResponse } from "next/server";

const LOCALES = ["de", "en"] as const;
const DEFAULT_LOCALE = "de";

const LOCALE_COOKIE = "NEXT_LANG";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isLocale(value: string | undefined): value is (typeof LOCALES)[number] {
  return value === "de" || value === "en";
}

function withLocaleCookie(
  response: NextResponse,
  lang: (typeof LOCALES)[number]
): NextResponse {
  response.cookies.set(LOCALE_COOKIE, lang, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
  return response;
}

function localeFromCookie(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): (typeof LOCALES)[number] {
  const raw = req.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Paths that skip locale prefixing and RBAC (handlers enforce their own auth). */
function isAuthExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/play-areas") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();
  const { pathname } = req.nextUrl;

  if (isAuthExemptPath(pathname)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const lang = isLocale(maybeLocale) ? maybeLocale : null;
  const hasLocalePrefix = lang !== null;

  if (!hasLocalePrefix) {
    const fallbackLang = localeFromCookie(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${fallbackLang}${pathname === "/" ? "" : pathname}`;
    return withLocaleCookie(NextResponse.redirect(url), fallbackLang);
  }

  const pathWithoutLocale =
    pathname.replace(new RegExp(`^/${lang}`), "") || "/";

  if (pathWithoutLocale.startsWith("/sign-in")) {
    return withLocaleCookie(NextResponse.next(), lang);
  }

  if (!userId) {
    const url = new URL(`/${lang}/sign-in`, req.url);
    return withLocaleCookie(NextResponse.redirect(url), lang);
  }

  const role = resolveRoleFromClaims(sessionClaims);

  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    if (!role) {
      const url = new URL(`/${lang}/sign-in`, req.url);
      return withLocaleCookie(NextResponse.redirect(url), lang);
    }
    const url = new URL(defaultHomePath(lang, role), req.url);
    return withLocaleCookie(NextResponse.redirect(url), lang);
  }

  const decision = evaluateRouteAccess(pathWithoutLocale, role);

  if (decision === "deny") {
    const target = accessDeniedRedirectPath(lang, role);
    const url = new URL(target, req.url);
    return withLocaleCookie(NextResponse.redirect(url), lang);
  }

  return withLocaleCookie(NextResponse.next(), lang);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|svg|ico)).*)",
    "/api/(.*)",
  ],
};
