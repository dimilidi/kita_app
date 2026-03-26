import prisma from "@/lib/prisma";
import { parseDateStrToUtcRange, todayDateStrLocal } from "@/lib/attendanceDate";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import AttendancePageClient, {
  type AttendanceRow,
} from "./AttendancePageClient";

function normalizeDateParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return todayDateStrLocal();
  }
  return value;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { userId, role } = getAuthData();
  const dateStr = normalizeDateParam(searchParams.date);
  const classIdParam = searchParams.classId ?? "all";

  const studentWhere: Prisma.StudentWhereInput = {};

  switch (role) {
    case "admin":
      break;
    case "teacher":
      studentWhere.class = {
        lessons: { some: { teacherId: userId! } },
      };
      break;
    case "student":
      studentWhere.id = userId!;
      break;
    case "parent":
      studentWhere.parentId = userId!;
      break;
    default:
      break;
  }

  if (classIdParam && classIdParam !== "all") {
    const cid = parseInt(classIdParam, 10);
    if (!Number.isNaN(cid)) {
      studentWhere.classId = cid;
    }
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: { class: true },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  const { start, end } = parseDateStrToUtcRange(dateStr)!;

  const classIds = [...new Set(students.map((s) => s.classId))];

  const lessonsByClass =
    classIds.length > 0
      ? await prisma.lesson.findMany({
          where: { classId: { in: classIds } },
          orderBy: { startTime: "asc" },
          select: { id: true, classId: true },
        })
      : [];

  const lessonIdByClass = new Map<number, number>();
  for (const l of lessonsByClass) {
    if (!lessonIdByClass.has(l.classId)) {
      lessonIdByClass.set(l.classId, l.id);
    }
  }

  const lessonIds = classIds
    .map((cid) => lessonIdByClass.get(cid))
    .filter((id): id is number => id !== undefined);

  const attendanceRows =
    lessonIds.length > 0 && students.length > 0
      ? await prisma.attendance.findMany({
          where: {
            date: { gte: start, lt: end },
            lessonId: { in: lessonIds },
            studentId: { in: students.map((s) => s.id) },
          },
        })
      : [];

  const key = (studentId: string, lessonId: number) => `${studentId}:${lessonId}`;
  const attendanceByKey = new Map<
    string,
    { present: boolean; note: string | null; actualPickupTime: string | null }
  >();
  for (const row of attendanceRows) {
    attendanceByKey.set(key(row.studentId, row.lessonId), {
      present: row.present,
      note: row.note ?? null,
      actualPickupTime: row.actualPickupTime ?? null,
    });
  }

  const rows: AttendanceRow[] = students.map((s) => {
    const lessonId = lessonIdByClass.get(s.classId) ?? null;
    const att =
      lessonId !== null ? attendanceByKey.get(key(s.id, lessonId)) : undefined;
    const present = att?.present ?? false;
    const defaultPickup = s.pickupTime ?? null;
    const actualPickup = att?.actualPickupTime ?? null;
    const displayPickupTime = actualPickup ?? defaultPickup ?? null;
    return {
      id: s.id,
      name: s.name,
      surname: s.surname,
      classId: s.classId,
      className: s.class.name,
      lessonId,
      present,
      bringTime: s.bringTime ?? null,
      defaultPickupTime: defaultPickup,
      actualPickupTime: actualPickup,
      displayPickupTime,
      note: att?.note ?? null,
    };
  });

  let classesForFilter: { id: number; name: string }[] = [];
  if (role === "admin") {
    classesForFilter = await prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } else if (role === "teacher") {
    classesForFilter = await prisma.class.findMany({
      where: { lessons: { some: { teacherId: userId! } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } else if (classIds.length > 0) {
    classesForFilter = await prisma.class.findMany({
      where: { id: { in: classIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  const canEdit = role === "admin" || role === "teacher";

  return (
    <AttendancePageClient
      dateStr={dateStr}
      classId={classIdParam}
      rows={rows}
      classes={classesForFilter}
      canEdit={canEdit}
    />
  );
}
