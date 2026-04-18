import prisma from "@/lib/prisma";
import PlayBoard from "../../../play/PlayBoard";
import { Prisma } from "@prisma/client";
import {
  normalizeAttendanceDateStr,
  parseDateStrToUtcRange,
} from "@/lib/attendanceDate";
import {
  filterTeachersForBoard,
  getTeacherAttendanceByDate,
} from "@/lib/teacherAttendance";

type StudentWithClass = Prisma.StudentGetPayload<{
  include: { class: true };
}>;

export default async function PlayBoardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const dateStr = normalizeAttendanceDateStr(searchParams.date);
  const dayRange = parseDateStrToUtcRange(dateStr);

  const teacherAttendanceRows =
    dayRange != null ? await getTeacherAttendanceByDate(dateStr) : [];

  const students: StudentWithClass[] = await prisma.student.findMany({
    include: {
      class: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const zonesFull = await prisma.zone.findMany({
    orderBy: { name: "asc" },
    include: {
      activities: { orderBy: { name: "asc" }, select: { name: true } },
      lessons: { select: { name: true } },
    },
  });

  const zoneActivityNames: Record<string, string[]> = {};
  for (const z of zonesFull) {
    zoneActivityNames[z.id] = Array.from(
      new Set([
        ...z.activities.map((a) => a.name),
        ...z.lessons.map((l) => l.name),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }

  const zones = zonesFull.map(
    ({ activities: _activities, lessons: _lessons, ...zone }) => zone
  );

  const studentZones = await prisma.studentZone.findMany();

  const teachersAll = await prisma.teacher.findMany({
    select: { id: true, name: true, surname: true, img: true },
    orderBy: { name: "asc" },
  });

  const teachers = filterTeachersForBoard(teachersAll, teacherAttendanceRows);
  const teacherAttendanceFilterActive = teacherAttendanceRows.length > 0;

  const teacherZoneRows = await prisma.teacherZone.findMany();

  const initialZones: Record<string, string[]> = {};

  zones.forEach((z) => {
    initialZones[z.id] = [];
  });

  initialZones["pool"] = [];

  studentZones.forEach((sz) => {
    initialZones[sz.zoneId]?.push(sz.studentId);
  });

  const placedStudents = new Set(studentZones.map((z) => z.studentId));

  students.forEach((s) => {
    if (!placedStudents.has(s.id)) {
      initialZones.pool.push(s.id);
    }
  });

  const initialTeacherZones: Record<string, string[]> = {};
  zones.forEach((z) => {
    initialTeacherZones[z.id] = [];
  });
  initialTeacherZones.teacherPool = [];

  const teacherToZone = new Map<string, string>();
  for (const row of teacherZoneRows) {
    if (!teacherToZone.has(row.teacherId)) {
      teacherToZone.set(row.teacherId, row.zoneId);
    }
  }

  for (const t of teachers) {
    const zid = teacherToZone.get(t.id);
    if (zid != null && initialTeacherZones[zid] !== undefined) {
      initialTeacherZones[zid].push(t.id);
    } else {
      initialTeacherZones.teacherPool.push(t.id);
    }
  }

  return (
    <div className="p-4 print:p-0 print:overflow-visible print:h-auto print:min-h-0">
      <PlayBoard
        students={students}
        teachers={teachers}
        zones={zones}
        initialZones={initialZones}
        initialTeacherZones={initialTeacherZones}
        zoneActivityNames={zoneActivityNames}
        boardDateStr={dateStr}
        teacherAttendanceFilterActive={teacherAttendanceFilterActive}
      />
    </div>
  );
}
