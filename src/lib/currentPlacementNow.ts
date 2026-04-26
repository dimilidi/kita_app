import prisma from "@/lib/prisma";
import {
  getActiveActivityAssignmentsNow,
  getActiveActivityDebugNow,
} from "@/lib/activeActivityNow";

export type TeacherPlacementNow =
  | { type: "activity"; zoneId: string; activityName: string; locked: true }
  | { type: "lunch"; groupId: string; groupName: string; locked: false }
  | { type: "zone"; zoneId: string; zoneName: string; locked: false }
  | { type: "pool"; locked: false };

/**
 * Single source of truth for teacher placement "right now".
 *
 * Priority:
 * - Active Lesson (derived) → activity zone (locked)
 * - Lunch assignment (TeacherLunchGroup)
 * - Manual play zone (TeacherZone)
 * - Pool (default)
 */
export async function getCurrentPlacementNow(): Promise<Map<string, TeacherPlacementNow>> {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    { teacherZoneByTeacherId },
    teacherZones,
    teacherLunch,
    lunchGroups,
    zones,
    debug,
    teachersAll,
    lessonsActiveNow,
  ] = await Promise.all([
    getActiveActivityAssignmentsNow(),
    prisma.teacherZone.findMany({ select: { teacherId: true, zoneId: true } }),
    prisma.teacherLunchGroup.findMany({
      select: { teacherId: true, groupId: true },
    }),
    (prisma as any).lunchGroupEntity.findMany({ select: { id: true, name: true } }),
    prisma.zone.findMany({ select: { id: true, name: true } }),
    getActiveActivityDebugNow(),
    prisma.teacher.findMany({ select: { id: true } }),
    prisma.lesson.findMany({
      where: {
        startTime: { gte: todayStart, lt: tomorrowStart },
        AND: [{ startTime: { lte: now } }, { endTime: { gte: now } }],
      },
      select: { teacherId: true, zoneId: true, name: true },
    }),
  ]);

  const placement = new Map<string, TeacherPlacementNow>();

  const groupNameById = new Map<string, string>(
    (lunchGroups as Array<{ id: string; name: string }>).map((g) => [g.id, g.name])
  );
  const zoneNameById = new Map<string, string>(zones.map((z) => [z.id, z.name]));

  // default: pool (implicitly)
  for (const z of teacherZones) {
    placement.set(z.teacherId, {
      type: "zone",
      zoneId: z.zoneId,
      zoneName: zoneNameById.get(z.zoneId) ?? z.zoneId,
      locked: false,
    });
  }
  for (const l of teacherLunch) {
    placement.set(l.teacherId, {
      type: "lunch",
      groupId: l.groupId,
      groupName: groupNameById.get(l.groupId) ?? l.groupId,
      locked: false,
    });
  }

  // Active lessons (teacherId → activityName + zoneId)
  const activeLessonByTeacherId = new Map<
    string,
    { activityName: string; zoneId: string }
  >();
  for (const l of lessonsActiveNow) {
    if (!activeLessonByTeacherId.has(l.teacherId)) {
      activeLessonByTeacherId.set(l.teacherId, {
        activityName: l.name,
        zoneId: l.zoneId,
      });
    }
  }

  for (const [teacherId, zoneId] of teacherZoneByTeacherId.entries()) {
    const meta = activeLessonByTeacherId.get(teacherId);
    placement.set(teacherId, {
      type: "activity",
      zoneId,
      activityName: meta?.activityName ?? "Activity",
      locked: true,
    });
  }

  // Temporary debug logging (dev only).
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[placement] now", {
      nowIso: debug.nowIso,
      todayLocalStartIso: debug.todayLocalStartIso,
      activeLessonCount: debug.lessonsToday.filter((l) => l.active).length,
    });

    const zoneByTeacher = new Map(teacherZones.map((z) => [z.teacherId, z.zoneId]));
    const lunchByTeacher = new Map(teacherLunch.map((l) => [l.teacherId, l.groupId]));
    const lessonsByTeacher = new Map<string, typeof debug.lessonsToday>();
    for (const l of debug.lessonsToday) {
      const arr = lessonsByTeacher.get(l.teacherId) ?? [];
      arr.push(l);
      lessonsByTeacher.set(l.teacherId, arr);
    }

    for (const t of teachersAll) {
      const p = placement.get(t.id) ?? { type: "pool", locked: false };
      const lessons = lessonsByTeacher.get(t.id) ?? [];
      // eslint-disable-next-line no-console
      console.log("[placement] teacher", {
        teacherId: t.id,
        placement: p,
        hasActivityDetected: p.type === "activity",
        lunchGroupId: lunchByTeacher.get(t.id) ?? null,
        teacherZoneId: zoneByTeacher.get(t.id) ?? null,
        lessonsToday: lessons,
      });
    }
  }

  return placement;
}

