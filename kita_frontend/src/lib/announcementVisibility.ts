import { Prisma } from "@prisma/client";

/**
 * Same visibility rules as list/announcements and dashboard Announcements widget.
 */
export function announcementAccessWhere(
  role: string | null,
  userId: string | null | undefined
): Prisma.AnnouncementWhereInput {
  if (!userId) {
    return { id: { in: [] } };
  }

  if (role === "admin") {
    return {};
  }

  const roleConditions: Record<
    string,
    Prisma.ClassWhereInput | undefined
  > = {
    teacher: { lessons: { some: { teacherId: userId } } },
    student: { students: { some: { id: userId } } },
    parent: { students: { some: { parentId: userId } } },
  };

  const rc = role ? roleConditions[role] : undefined;
  if (!rc) {
    return { id: { in: [] } };
  }

  return {
    OR: [{ classId: null }, { class: rc }],
  };
}
