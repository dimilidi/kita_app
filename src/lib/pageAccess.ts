import { clerkClient } from "@clerk/nextjs/server";
import { isAppRole, type AppRole } from "@/lib/actionAuth";
import prisma from "@/lib/prisma";
import { teacherMayEditStudentAttendance } from "@/lib/teacherAttendanceScope";
import { getAuthData } from "@/lib/utils";

export type ViewerContext = {
  userId: string | null;
  role: string | null;
};

export function getViewerContext(): ViewerContext {
  const { userId, role } = getAuthData();
  return { userId: userId ?? null, role: role ?? null };
}

/** Clerk id match or legacy username match (same rules as profile link). */
export async function clerkUserMatchesStudent(
  clerkUserId: string,
  student: { id: string; username: string }
): Promise<boolean> {
  if (clerkUserId === student.id) return true;
  try {
    const cu = await clerkClient.users.getUser(clerkUserId);
    const uname =
      typeof cu.username === "string" && cu.username.length > 0
        ? cu.username
        : null;
    return uname != null && uname === student.username;
  } catch {
    return false;
  }
}

/**
 * Who may open `/list/students/:id`:
 * - admin: any student
 * - teacher: students in supervised / taught classes
 * - parent: own children only
 * - student: own profile only
 */
export async function canViewStudentProfile(
  viewer: ViewerContext,
  studentId: string
): Promise<boolean> {
  if (!viewer.userId || !isAppRole(viewer.role)) return false;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, username: true, parentId: true, classId: true },
  });
  if (!student) return false;

  switch (viewer.role) {
    case "admin":
      return true;
    case "parent":
      return student.parentId === viewer.userId;
    case "student":
      return await clerkUserMatchesStudent(viewer.userId, student);
    case "teacher":
      return teacherMayEditStudentAttendance(viewer.userId, student.classId);
    default:
      return false;
  }
}

/** Parent email/phone on student profile — not for unrelated viewers. */
export function canViewStudentParentContact(
  viewer: ViewerContext,
  studentParentId: string
): boolean {
  if (!isAppRole(viewer.role)) return false;
  if (viewer.role === "admin" || viewer.role === "teacher") return true;
  if (viewer.role === "parent" && viewer.userId === studentParentId) return true;
  return false;
}

/**
 * `/list/parents/:id` — staff roster + parent viewing own record only.
 */
export async function canViewParentProfile(
  viewer: ViewerContext,
  parentId: string
): Promise<boolean> {
  if (!viewer.userId || !isAppRole(viewer.role)) return false;
  if (viewer.role === "admin" || viewer.role === "teacher") return true;
  if (viewer.role === "parent") return parentId === viewer.userId;
  return false;
}

/**
 * `/list/teachers/:id` — admin any; teacher own profile only.
 */
export function canViewTeacherProfile(
  viewer: ViewerContext,
  teacherId: string
): boolean {
  if (!isAppRole(viewer.role)) return false;
  if (viewer.role === "admin") return true;
  if (viewer.role === "teacher" && viewer.userId === teacherId) return true;
  return false;
}

export function canViewStaffOnlyRoute(role: string | null | undefined): role is AppRole {
  return role === "admin" || role === "teacher";
}
