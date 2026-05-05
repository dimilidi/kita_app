import prisma from "@/lib/prisma";
import PlayBoard from "../../../play/PlayBoard";
import { Prisma } from "@prisma/client";
import { getEffectivePlacementNow } from "@/lib/effectivePlacementNow";
import { getCurrentPlacementNow } from "@/lib/currentPlacementNow";
import {
  parseDateStrToUtcRange,
  todayDateStrLocal,
} from "@/lib/attendanceDate";
import {
  filterTeachersForBoard,
  getTeacherAttendanceByDate,
} from "@/lib/teacherAttendance";
import {
  isNowWithinLunchSlot,
  isWithinOverallLunchServiceWindow,
  lunchSlotForLunchGroupEntity,
  type LunchSlotKey,
} from "@/lib/lunchSchedule";

type StudentWithClass = Prisma.StudentGetPayload<{
  include: { class: true };
}>;

export default async function PlayBoardPage() {
  const effective = await getEffectivePlacementNow();
  const teacherPlacement = await getCurrentPlacementNow();
  const now = new Date();
  const lockedTeacherIds = Array.from(teacherPlacement.entries())
    .filter(([, p]) => p.type === "activity")
    .map(([id]) => id);

  const attendanceDayStr = todayDateStrLocal();
  const dayRange = parseDateStrToUtcRange(attendanceDayStr);

  const studentsAll: StudentWithClass[] = await prisma.student.findMany({
    include: {
      class: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Filter play-board student catalog to only "checked-in" kids for the day.
  // If there are no attendance rows for today yet, keep previous behavior (show all).
  const students = await (async () => {
    if (!dayRange) return studentsAll;

    const studentIdsForAttendance = studentsAll.map((s) => s.id);
    const classIds = Array.from(new Set(studentsAll.map((s) => s.classId)));

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
      if (!lessonIdByClass.has(l.classId)) lessonIdByClass.set(l.classId, l.id);
    }

    const lessonIds = classIds
      .map((cid) => lessonIdByClass.get(cid))
      .filter((id): id is number => id !== undefined);

    const attendanceRows =
      lessonIds.length > 0 && studentIdsForAttendance.length > 0
        ? await prisma.attendance.findMany({
            where: {
              date: { gte: dayRange.start, lt: dayRange.end },
              lessonId: { in: lessonIds },
              studentId: { in: studentIdsForAttendance },
            },
            select: { studentId: true, present: true, actualPickupTime: true },
          })
        : [];

    // Strict rule: no attendance rows for today => no students shown in the board/pool.
    if (attendanceRows.length === 0) return [];

    const checkedInStudentIds = new Set(
      attendanceRows
        .filter((r) => r.present && !r.actualPickupTime)
        .map((r) => r.studentId)
    );
    return studentsAll.filter((s) => checkedInStudentIds.has(s.id));
  })();

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

  const studentIds = students.map((s) => s.id);
  const [studentLunchLinks, lunchGroupEntities] = await Promise.all([
    studentIds.length
      ? prisma.studentLunchGroup.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true, groupId: true },
        })
      : [],
    prisma.lunchGroupEntity.findMany({
      select: { id: true, name: true, color: true },
    }),
  ]);

  const slotByGroupId = new Map<string, LunchSlotKey>();
  for (const g of lunchGroupEntities) {
    const slot = lunchSlotForLunchGroupEntity({ name: g.name, color: g.color });
    if (slot) slotByGroupId.set(g.id, slot);
  }

  const lunchNowByStudentId: Record<string, boolean> = {};
  for (const link of studentLunchLinks) {
    if (!link.groupId) continue;
    const slot = slotByGroupId.get(link.groupId);
    if (slot && isNowWithinLunchSlot(slot, now)) {
      lunchNowByStudentId[link.studentId] = true;
    }
  }

  const essraumZoneId =
    zones.find((z) => /essraum/i.test(z.name.trim()))?.id ?? null;
  const highlightEssraum =
    essraumZoneId != null && isWithinOverallLunchServiceWindow(now);

  const teachersAll = await prisma.teacher.findMany({
    select: { id: true, name: true, surname: true, img: true },
    orderBy: { name: "asc" },
  });

  const teacherAttendanceRows =
    await getTeacherAttendanceByDate(attendanceDayStr);
  // Strict rule: no teacher-attendance rows for today => no teachers shown in the board/pool.
  const teachers =
    teacherAttendanceRows.length === 0
      ? []
      : filterTeachersForBoard(teachersAll, teacherAttendanceRows);

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
        teacherAttendanceFilterActive={true}
        lunchNowByStudentId={lunchNowByStudentId}
        essraumZoneId={essraumZoneId}
        highlightEssraum={highlightEssraum}
      />
    </div>
  );
}
