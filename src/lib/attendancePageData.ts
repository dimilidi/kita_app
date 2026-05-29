import prisma from "@/lib/prisma";
import {
  normalizeAttendanceDateStr,
  parseDateStrToUtcRange,
} from "@/lib/attendanceDate";
import { teacherMayEditStudentAttendance } from "@/lib/teacherAttendanceScope";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { isAppRole } from "@/lib/roles";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import type { AttendanceRow } from "@/app/(dashboard)/list/attendance/types";

type LoadOpts = {
  dateStr?: string;
  classIdParam: string;
  search?: string;
  sex?: string;
  status?: string;
  page?: number;
  /** Load every row (e.g. PDF export); ignores pagination. */
  fetchAllRows?: boolean;
};

export async function loadAttendancePageData(opts: LoadOpts) {
  const { userId, role } = getAuthData();
  const dateStr = normalizeAttendanceDateStr(opts.dateStr);
  const classIdParam = opts.classIdParam ?? "all";
  const rawSearch = typeof opts.search === "string" ? opts.search.trim() : "";
  const sexFilter = opts.sex === "MALE" || opts.sex === "FEMALE" ? opts.sex : null;
  const statusFilter =
    opts.status === "absent" ||
    opts.status === "checked_in" ||
    opts.status === "checked_out"
      ? (opts.status as "absent" | "checked_in" | "checked_out")
      : null;
  const fetchAllRows = opts.fetchAllRows ?? false;
  const rawPage = opts.page;
  const parsed =
    rawPage !== undefined ? parseInt(String(rawPage), 10) : 1;
  const safePage =
    Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;

  const scopeParts: Prisma.StudentWhereInput[] = [];

  switch (role) {
    case "admin":
      break;
    case "teacher":
      scopeParts.push({
        OR: [
          { class: { supervisorId: userId! } },
          { class: { lessons: { some: { teacherId: userId! } } } },
        ],
      });
      break;
    case "student":
      scopeParts.push({ id: userId! });
      break;
    case "parent":
      scopeParts.push({ parentId: userId! });
      break;
    default:
      // Fail closed: unknown or missing role sees no students.
      scopeParts.push({ id: { in: [] } });
      break;
  }

  if (!isAppRole(role) || !userId) {
    scopeParts.push({ id: { in: [] } });
  }

  if (classIdParam && classIdParam !== "all") {
    const cid = parseInt(classIdParam, 10);
    if (!Number.isNaN(cid)) {
      scopeParts.push({ classId: cid });
    }
  }

  if (rawSearch) {
    scopeParts.push({
      OR: [
        { name: { contains: rawSearch, mode: "insensitive" } },
        { surname: { contains: rawSearch, mode: "insensitive" } },
      ],
    });
  }
  if (sexFilter) {
    scopeParts.push({ sex: sexFilter as "MALE" | "FEMALE" });
  }

  const studentWhere: Prisma.StudentWhereInput =
    scopeParts.length === 0
      ? {}
      : scopeParts.length === 1
        ? scopeParts[0]!
        : { AND: scopeParts };

  const classIdGroups = await prisma.student.groupBy({
    by: ["classId"],
    where: studentWhere,
  });
  const classIds = classIdGroups.map((g) => g.classId);

  const { start, end } = parseDateStrToUtcRange(dateStr)!;

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

  const allStudentsMinimal = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, classId: true },
  });

  const studentIdsForAttendance = allStudentsMinimal.map((s) => s.id);

  const attendanceRows =
    lessonIds.length > 0 && studentIdsForAttendance.length > 0
      ? await prisma.attendance.findMany({
          where: {
            date: { gte: start, lt: end },
            lessonId: { in: lessonIds },
            studentId: { in: studentIdsForAttendance },
          },
          // Ensure deterministic "latest row wins" when re-check-in creates multiple rows per day.
          orderBy: { id: "asc" },
          select: {
            id: true,
            studentId: true,
            lessonId: true,
            present: true,
            note: true,
            actualPickupTime: true,
          },
        })
      : [];

  const key = (studentId: string, lessonId: number) =>
    `${studentId}:${lessonId}`;
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

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: { class: true },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  const teacherAllowByClassId = new Map<number, boolean>();
  if (role === "teacher" && userId) {
    const uniqueClassIds = Array.from(new Set(students.map((s) => s.classId)));
    for (const cid of uniqueClassIds) {
      teacherAllowByClassId.set(
        cid,
        await teacherMayEditStudentAttendance(userId, cid)
      );
    }
  }

  const rowsAll: AttendanceRow[] = students.map((s) => {
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
      canEditAttendance:
        role === "admin"
          ? true
          : role === "teacher"
            ? teacherAllowByClassId.get(s.classId) ?? false
            : undefined,
    };
  });

  const filteredRows =
    statusFilter == null
      ? rowsAll
      : rowsAll.filter((r) => {
          const derived =
            !r.present ? "absent" : r.actualPickupTime ? "checked_out" : "checked_in";
          return derived === statusFilter;
        });

  const totalCount = filteredRows.length;
  const absentCount = filteredRows.reduce((acc, r) => acc + (!r.present ? 1 : 0), 0);
  const checkedOutCount = filteredRows.reduce(
    (acc, r) => acc + (r.present && !!r.actualPickupTime ? 1 : 0),
    0
  );
  const checkedInCount = totalCount - absentCount - checkedOutCount;

  const pageRows = fetchAllRows
    ? filteredRows
    : filteredRows.slice(
        ITEM_PER_PAGE * (safePage - 1),
        ITEM_PER_PAGE * safePage
      );

  let classesForFilter: { id: number; name: string }[] = [];
  if (role === "admin") {
    classesForFilter = await prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } else if (role === "teacher") {
    classesForFilter = await prisma.class.findMany({
      where: {
        OR: [
          { supervisorId: userId! },
          { lessons: { some: { teacherId: userId! } } },
        ],
      },
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
  const canRevertAbsent = role === "admin";

  return {
    viewerRole: role,
    dateStr,
    classIdParam,
    rows: pageRows,
    count: totalCount,
    page: safePage,
    summary: {
      total: totalCount,
      absentCount,
      checkedInCount,
      checkedOutCount,
    },
    classesForFilter,
    canEdit,
    canRevertAbsent,
  };
}
