import prisma from "@/lib/prisma";

/** Group lead (supervisor) OR teaches an activity (lesson) for that class. */
export async function teacherMayEditStudentAttendance(
  teacherId: string,
  studentClassId: number
): Promise<boolean> {
  const cls = await prisma.class.findUnique({
    where: { id: studentClassId },
    select: { supervisorId: true },
  });
  if (!cls) return false;
  if (cls.supervisorId === teacherId) return true;

  const teaches = await prisma.lesson.findFirst({
    where: { classId: studentClassId, teacherId },
    select: { id: true },
  });
  return teaches != null;
}
