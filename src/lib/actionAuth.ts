import { getAuthData } from "@/lib/utils";

/** Roles synced with Clerk `publicMetadata.role` and middleware RBAC. */
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

export type AuthSession = {
  userId: string;
  role: AppRole;
};

export type FormActionDenial = {
  success: false;
  error: true;
  message: string;
};

/** Fail-closed: authenticated user with a known app role. */
export function requireAuth(): AuthSession | null {
  const { userId, role } = getAuthData();
  if (!userId || !isAppRole(role)) {
    return null;
  }
  return { userId, role };
}

export function requireRole(
  allowed: readonly AppRole[]
): AuthSession | null {
  const session = requireAuth();
  if (!session) {
    return null;
  }
  if (!allowed.includes(session.role)) {
    return null;
  }
  return session;
}

export function requireAdmin(): AuthSession | null {
  return requireRole(["admin"]);
}

export function requireStaff(): AuthSession | null {
  return requireRole(["admin", "teacher"]);
}

export function requireParent(): AuthSession | null {
  return requireRole(["parent"]);
}

export function formDenied(message = "Forbidden"): FormActionDenial {
  return { success: false, error: true, message };
}

/** For `useFormState` actions — returns denial object or null if allowed. */
export function denyFormUnlessRole(
  allowed: readonly AppRole[],
  message = "Forbidden"
): FormActionDenial | null {
  if (!requireRole(allowed)) {
    return formDenied(message);
  }
  return null;
}

/** Admin or the user editing their own record (teacher/student profile). */
export function denyFormUnlessAdminOrSelf(
  targetUserId: string,
  message = "Forbidden"
): FormActionDenial | null {
  const session = requireAuth();
  if (!session) {
    return formDenied(message);
  }
  if (session.role === "admin" || session.userId === targetUserId) {
    return null;
  }
  return formDenied(message);
}

export function forbiddenError(): Error {
  return new Error("Forbidden");
}
