/** App roles — safe to import from client and server (no Clerk/Node APIs). */

export type AppRole = "admin" | "teacher" | "student" | "parent";

export const APP_ROLES: readonly AppRole[] = [
  "admin",
  "teacher",
  "student",
  "parent",
] as const;

export function isAppRole(role: string | null | undefined): role is AppRole {
  return (
    role === "admin" ||
    role === "teacher" ||
    role === "student" ||
    role === "parent"
  );
}
