import prisma from "@/lib/prisma";
import LunchBoardClient from "./LunchBoardClient";
import { Prisma } from "@prisma/client";
import {
  normalizeAttendanceDateStr,
  parseDateStrToUtcRange,
} from "@/lib/attendanceDate";
import { redirect } from "next/navigation";
import {
  filterTeachersForBoard,
  getTeacherAttendanceByDate,
} from "@/lib/teacherAttendance";
import { getCurrentPlacementNow } from "@/lib/currentPlacementNow";

export default async function LunchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  // Prevent landing on weekend dates via URL.
  const requested = searchParams.date;
  const dateStr = normalizeAttendanceDateStr(requested);
  if (requested && requested !== dateStr) {
    const { search } = searchParams;
    redirect(
      `?date=${encodeURIComponent(dateStr)}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    );
  }
  const dayRange = parseDateStrToUtcRange(dateStr);

  const attendanceForDate =
    dayRange != null
      ? await prisma.attendance.findMany({
          where: {
            date: { gte: dayRange.start, lt: dayRange.end },
          },
          select: { studentId: true, present: true },
        })
      : [];

  /** No rows for this day → show all students (same as before attendance exists). */
  const useAttendanceFilter = attendanceForDate.length > 0;
  const presentStudentIds = useAttendanceFilter
    ? new Set(
        attendanceForDate.filter((a) => a.present).map((a) => a.studentId)
      )
    : null;

  const query: Prisma.StudentWhereInput = {};
  const { search } = searchParams;

  if (search) {
    query.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
    ];
  }

  if (presentStudentIds !== null) {
    query.id = { in: Array.from(presentStudentIds) };
  }

  const students = await prisma.student.findMany({
    where: query,
    include: { class: true },
    orderBy: { name: "asc" },
  });

  const allowedStudentIds = new Set(students.map((s) => s.id));

  const lunchGroups = await (prisma as any).lunchGroupEntity.findMany({
    orderBy: { createdAt: "asc" },
  });

  const lunchAssignments = await prisma.studentLunchGroup.findMany();
  const initialGroups: Record<string, string[]> = { pool: [] };
  lunchGroups.forEach((group: { id: string }) => {
    initialGroups[group.id] = [];
  });

  lunchAssignments.forEach((assignment) => {
    if (!allowedStudentIds.has(assignment.studentId)) return;
    const assignmentGroupId = (assignment as any).groupId as string | undefined;
    if (assignmentGroupId && initialGroups[assignmentGroupId]) {
      initialGroups[assignmentGroupId].push(assignment.studentId);
    }
  });

  const assignedStudents = new Set(
    lunchAssignments
      .filter((item) => allowedStudentIds.has(item.studentId))
      .map((item) => item.studentId)
  );
  students.forEach((student) => {
    if (!assignedStudents.has(student.id)) {
      initialGroups.pool.push(student.id);
    }
  });

  const tischsprueche = await prisma.tischspruch.findMany({
    orderBy: { createdAt: "asc" },
  });

  const lunchVotes = await prisma.studentLunchVote.findMany();
  const initialVotes = Object.fromEntries(
    lunchVotes
      .filter((vote) => allowedStudentIds.has(vote.studentId))
      .map((vote) => [vote.studentId, vote.tischspruchId])
  );

  const teachersAll = await prisma.teacher.findMany({
    select: { id: true, name: true, surname: true, img: true },
    orderBy: { name: "asc" },
  });

  const placementNow = await getCurrentPlacementNow();
  const lockedTeacherIds = new Set(
    Array.from(placementNow.entries())
      .filter(([, p]) => p.type === "activity")
      .map(([id]) => id)
  );

  const teacherAttendanceRows =
    dayRange != null ? await getTeacherAttendanceByDate(dateStr) : [];

  const teachersBase = filterTeachersForBoard(teachersAll, teacherAttendanceRows);
  const teachers = teachersBase.map((t) => {
    const p = placementNow.get(t.id) ?? { type: "pool", locked: false };
    if (p.type === "activity") {
      return { ...t, subtitle: `Activity: ${p.activityName}`, readOnly: true };
    }
    // requirement: in lunch board educator pool, show zone name if they are in a play zone
    if (p.type === "zone") {
      return { ...t, subtitle: p.zoneName };
    }
    return t;
  });
  const teacherAttendanceFilterActive = teacherAttendanceRows.length > 0;

  const teacherLunchRows = await prisma.teacherLunchGroup.findMany();

  const initialTeacherLunchGroups: Record<string, string[]> = {
    teacherPool: [],
  };
  lunchGroups.forEach((group: { id: string }) => {
    initialTeacherLunchGroups[group.id] = [];
  });

  const teacherToGroup = new Map<string, string>();
  for (const row of teacherLunchRows) {
    if (!teacherToGroup.has(row.teacherId)) {
      teacherToGroup.set(row.teacherId, row.groupId);
    }
  }

  for (const t of teachers) {
    const gid = teacherToGroup.get(t.id);
    if (lockedTeacherIds.has(t.id)) {
      // Activity overrides everything: always keep visible in pool, non-draggable.
      initialTeacherLunchGroups.teacherPool.push(t.id);
    } else if (gid != null && initialTeacherLunchGroups[gid] !== undefined) {
      initialTeacherLunchGroups[gid].push(t.id);
    } else {
      initialTeacherLunchGroups.teacherPool.push(t.id);
    }
  }

  return (
    <div className="p-4 print:p-0 print:overflow-visible print:h-auto print:min-h-0">
      <LunchBoardClient
        students={students.map((student) => ({
          id: student.id,
          name: student.name,
          surname: student.surname,
          img: student.img ?? null,
          className: student.class.name,
        }))}
        teachers={teachers}
        initialGroups={initialGroups}
        initialTeacherLunchGroups={initialTeacherLunchGroups}
        lunchGroups={lunchGroups.map((group: any) => ({
          id: group.id,
          name: group.name,
          color: group.color ?? undefined,
          capacity: group.capacity ?? 15,
        }))}
        initialVotes={initialVotes}
        initialTischsprueche={tischsprueche}
        attendanceDateStr={dateStr}
        attendanceFilterActive={useAttendanceFilter}
        teacherAttendanceFilterActive={teacherAttendanceFilterActive}
      />
    </div>
  );
}
