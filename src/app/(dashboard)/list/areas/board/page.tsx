import prisma from "@/lib/prisma";
import PlayBoard from "../../../play/PlayBoard";
import { Prisma } from "@prisma/client";
import { getEffectivePlacementNow } from "@/lib/effectivePlacementNow";
import { getCurrentPlacementNow } from "@/lib/currentPlacementNow";
import { normalizeAttendanceDateStr } from "@/lib/attendanceDate";
import { redirect } from "next/navigation";
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
  // Match Attendance/Lunch Board: optional ?date=YYYY-MM-DD with weekend clamping.
  const requested = searchParams.date;
  const dateStr = normalizeAttendanceDateStr(requested);
  if (requested && requested !== dateStr) {
    redirect(`?date=${encodeURIComponent(dateStr)}`);
  }

  const effective = await getEffectivePlacementNow();
  const teacherPlacement = await getCurrentPlacementNow();
  const lockedTeacherIds = Array.from(teacherPlacement.entries())
    .filter(([, p]) => p.type === "activity")
    .map(([id]) => id);

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

  const teachersAll = await prisma.teacher.findMany({
    select: { id: true, name: true, surname: true, img: true },
    orderBy: { name: "asc" },
  });

  const teacherAttendanceRows = await getTeacherAttendanceByDate(dateStr);
  const teachers = filterTeachersForBoard(teachersAll, teacherAttendanceRows);

  const initialZones: Record<string, string[]> = {};

  zones.forEach((z) => {
    initialZones[z.id] = [];
  });

  initialZones["pool"] = [];

  for (const s of students) {
    const loc = effective.student.get(s.id);
    const zid =
      loc?.kind === "activity" || loc?.kind === "zone" ? loc.zoneId : null;
    if (zid && initialZones[zid]) initialZones[zid].push(s.id);
    else initialZones.pool.push(s.id);
  }

  const initialTeacherZones: Record<string, string[]> = {};
  zones.forEach((z) => {
    initialTeacherZones[z.id] = [];
  });
  initialTeacherZones.teacherPool = [];

  for (const t of teachers) {
    const p = teacherPlacement.get(t.id) ?? { type: "pool", locked: false };
    if (p.type === "activity" || p.type === "zone") {
      const zid = p.zoneId;
      if (zid && initialTeacherZones[zid] !== undefined) {
        initialTeacherZones[zid].push(t.id);
        continue;
      }
    }
    // lunch + pool -> show in pool on Play Board
    initialTeacherZones.teacherPool.push(t.id);
  }

  const teachersWithBadges = teachers.map((t) => {
    const p = teacherPlacement.get(t.id) ?? { type: "pool", locked: false };
    if (p.type === "activity") {
      return { ...t, subtitle: `Activity: ${p.activityName}`, readOnly: true };
    }
    if (p.type === "lunch") {
      // requirement: show in educator card (pool) why they aren't available
      return { ...t, subtitle: `Lunch: ${p.groupName}` };
    }
    return t;
  });

  return (
    <div className="p-4 print:p-0 print:overflow-visible print:h-auto print:min-h-0">
      <PlayBoard
        students={students}
        teachers={teachersWithBadges}
        zones={zones}
        initialZones={initialZones}
        initialTeacherZones={initialTeacherZones}
        zoneActivityNames={zoneActivityNames}
        lockedTeacherIds={lockedTeacherIds}
        attendanceDateStr={dateStr}
        teacherAttendanceFilterActive={teacherAttendanceRows.length > 0}
      />
    </div>
  );
}
