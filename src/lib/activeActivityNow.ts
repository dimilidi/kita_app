import prisma from "@/lib/prisma";

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function isSameLocalCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type ActiveActivityAssignmentNow = {
  teacherZoneByTeacherId: Map<string, string>;
  studentZoneByStudentId: Map<string, string>;
};

export type ActiveActivityDebugNow = {
  nowIso: string;
  todayLocalStartIso: string;
  lessonsToday: Array<{
    teacherId: string;
    zoneId: string;
    classId: number;
    startIso: string;
    endIso: string;
    isTodayByStartTime: boolean;
    active: boolean;
  }>;
};

export async function getActiveActivityDebugNow(): Promise<ActiveActivityDebugNow> {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const lessons = await prisma.lesson.findMany({
    // "Today" is determined by startTime's local calendar day.
    where: {
      startTime: { gte: todayStart, lt: tomorrowStart },
    },
    select: { teacherId: true, zoneId: true, classId: true, startTime: true, endTime: true },
  });

  const lessonsToday = lessons.map((l) => {
    const active = l.startTime <= now && now <= l.endTime;
    return {
      teacherId: l.teacherId,
      zoneId: l.zoneId,
      classId: l.classId,
      startIso: l.startTime.toISOString(),
      endIso: l.endTime.toISOString(),
      isTodayByStartTime: isSameLocalCalendarDay(l.startTime, now),
      active,
    };
  });

  return {
    nowIso: now.toISOString(),
    todayLocalStartIso: todayStart.toISOString(),
    lessonsToday,
  };
}

/**
 * "Activity" is defined as an active Lesson right now:
 * - startTime is on the same local calendar day as now ("today")
 * - and now is within [startTime, endTime] (inclusive)
 *
 * Returns required Zone placements for teachers + students.
 */
export async function getActiveActivityAssignmentsNow(): Promise<ActiveActivityAssignmentNow> {
  const now = new Date();
  const teacherZoneByTeacherId = new Map<string, string>();
  const studentZoneByStudentId = new Map<string, string>();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const lessons = await prisma.lesson.findMany({
    where: { startTime: { gte: todayStart, lt: tomorrowStart } },
    select: { teacherId: true, zoneId: true, classId: true, startTime: true, endTime: true },
  });

  const activeLessons = lessons.filter((l) => l.startTime <= now && now <= l.endTime);

  if (activeLessons.length === 0) return { teacherZoneByTeacherId, studentZoneByStudentId };

  for (const l of activeLessons) {
    teacherZoneByTeacherId.set(l.teacherId, l.zoneId);
  }

  const classIds = Array.from(new Set(activeLessons.map((l) => l.classId)));
  const students = await prisma.student.findMany({
    where: { classId: { in: classIds } },
    select: { id: true, classId: true },
  });

  const zoneByClassId = new Map<number, string>();
  for (const l of activeLessons) {
    if (!zoneByClassId.has(l.classId)) zoneByClassId.set(l.classId, l.zoneId);
  }
  for (const s of students) {
    const z = zoneByClassId.get(s.classId);
    if (z) studentZoneByStudentId.set(s.id, z);
  }

  return { teacherZoneByTeacherId, studentZoneByStudentId };
}

