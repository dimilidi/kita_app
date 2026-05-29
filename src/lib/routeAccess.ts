/**
 * Route RBAC configuration and pure path evaluation.
 * No server-only imports — safe for middleware and client bundles.
 */

import { isAppRole, type AppRole } from "@/lib/roles";

export type { AppRole };
export { APP_ROLES } from "@/lib/roles";

/** Legacy shape for tooling/docs. */
export type RouteAccessMap = Record<string, AppRole[]>;

/**
 * Ordered rules: more specific paths MUST come before broader prefixes
 * (e.g. `/list/lunch-groups` before `/list/lunch`).
 */
export const ROUTE_ACCESS_RULES: ReadonlyArray<{
  pattern: string;
  roles: readonly AppRole[];
}> = [
  { pattern: "/admin(.*)", roles: ["admin"] },
  { pattern: "/student(.*)", roles: ["student"] },
  { pattern: "/teacher(.*)", roles: ["teacher"] },
  { pattern: "/parent(.*)", roles: ["parent"] },
  { pattern: "/list/teachers-attendance(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/lunch-groups(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/tischsprueche(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/announcements(.*)", roles: ["admin", "teacher", "student", "parent"] },
  { pattern: "/list/attendance(.*)", roles: ["admin", "teacher", "student", "parent"] },
  { pattern: "/list/teachers(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/parents(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/students(.*)", roles: ["admin", "teacher", "student", "parent"] },
  { pattern: "/list/classes(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/lessons(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/events(.*)", roles: ["admin", "teacher", "student", "parent"] },
  { pattern: "/list/areas(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/lunch(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/messages(.*)", roles: ["admin", "teacher"] },
  { pattern: "/list/admins(.*)", roles: ["admin"] },
];

export const routeAccessMap: RouteAccessMap = Object.fromEntries(
  ROUTE_ACCESS_RULES.map((r) => [r.pattern, [...r.roles]])
);

export type RouteAccessDecision = "allow" | "deny";

function patternMatches(path: string, pattern: string): boolean {
  return new RegExp(`^${pattern}`).test(path);
}

/** Parse Clerk session claims (pure — no auth() call). */
export function resolveRoleFromClaims(sessionClaims: unknown): AppRole | null {
  if (!sessionClaims || typeof sessionClaims !== "object") return null;
  const claims = sessionClaims as Record<string, unknown>;
  const metadata = claims.metadata as { role?: string } | undefined;
  const publicMetadata = claims.publicMetadata as { role?: string } | undefined;
  const user = claims.user as { publicMetadata?: { role?: string } } | undefined;

  const raw =
    metadata?.role ?? publicMetadata?.role ?? user?.publicMetadata?.role ?? null;

  return isAppRole(raw) ? raw : null;
}

/**
 * Fail-closed route evaluation for authenticated dashboard traffic.
 */
export function evaluateRouteAccess(
  pathWithoutLocale: string,
  role: AppRole | null
): RouteAccessDecision {
  const path =
    pathWithoutLocale.length > 1 && pathWithoutLocale.endsWith("/")
      ? pathWithoutLocale.slice(0, -1)
      : pathWithoutLocale;

  if (path.startsWith("/sign-in")) {
    return "allow";
  }

  for (const rule of ROUTE_ACCESS_RULES) {
    if (!patternMatches(path, rule.pattern)) continue;
    if (!role || !rule.roles.includes(role)) return "deny";
    return "allow";
  }

  if (path === "/list" || path.startsWith("/list/")) {
    return "deny";
  }

  const homeMatch = path.match(/^\/(admin|teacher|student|parent)(\/.*)?$/);
  if (homeMatch) {
    const requiredRole = homeMatch[1] as AppRole;
    if (!role || role !== requiredRole) return "deny";
    return "allow";
  }

  if (path === "/" || path === "") {
    return role ? "allow" : "deny";
  }

  return "deny";
}

export function accessDeniedRedirectPath(
  lang: string,
  role: AppRole | null
): string {
  if (role) return `/${lang}/${role}`;
  return `/${lang}/sign-in`;
}

export function defaultHomePath(lang: string, role: AppRole): string {
  return `/${lang}/${role}`;
}
