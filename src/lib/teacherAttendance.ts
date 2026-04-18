import prisma from "@/lib/prisma";
import { parseDateStrToUtcRange } from "@/lib/attendanceDate";

/** Rows for one calendar day (normalized UTC range like student attendance). */
export async function getTeacherAttendanceByDate(dateStr: string) {
  const range = parseDateStrToUtcRange(dateStr);
  if (!range) return [];
  return prisma.teacherAttendance.findMany({
    where: {
      date: { gte: range.start, lt: range.end },
    },
    select: { teacherId: true, present: true },
  });
}

/** When any teacher-attendance rows exist for the day, boards only show teachers marked present. */
export function filterTeachersForBoard<
  T extends { id: string },
>(teachers: T[], attendanceRows: { teacherId: string; present: boolean }[]): T[] {
  if (attendanceRows.length === 0) return teachers;
  const presentIds = new Set(
    attendanceRows.filter((r) => r.present).map((r) => r.teacherId)
  );
  return teachers.filter((t) => presentIds.has(t.id));
}
