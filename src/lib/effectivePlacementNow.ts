import prisma from "@/lib/prisma";
import { getActiveActivityAssignmentsNow } from "@/lib/activeActivityNow";

export type EffectiveLocationKind = "activity" | "lunch" | "zone" | "none";

export type EffectiveLocation = {
  kind: EffectiveLocationKind;
  zoneId?: string;
  groupId?: string;
};

export type EffectivePlacementNow = {
  student: Map<string, EffectiveLocation>;
  teacher: Map<string, EffectiveLocation>;
};

/**
 * Computes effective "where is this person right now?" with priority:
 * Activity zone (derived from active Lesson)
 * else Lunch group (stored)
 * else Play zone (stored)
 */
export async function getEffectivePlacementNow(): Promise<EffectivePlacementNow> {
  const [{ teacherZoneByTeacherId, studentZoneByStudentId }, studentZones, teacherZones, studentLunch, teacherLunch] =
    await Promise.all([
      getActiveActivityAssignmentsNow(),
      prisma.studentZone.findMany({ select: { studentId: true, zoneId: true } }),
      prisma.teacherZone.findMany({ select: { teacherId: true, zoneId: true } }),
      prisma.studentLunchGroup.findMany({ select: { studentId: true, groupId: true } }),
      prisma.teacherLunchGroup.findMany({ select: { teacherId: true, groupId: true } }),
    ]);

  const student = new Map<string, EffectiveLocation>();
  const teacher = new Map<string, EffectiveLocation>();

  // Base: zone
  for (const z of studentZones) {
    student.set(z.studentId, { kind: "zone", zoneId: z.zoneId });
  }
  for (const z of teacherZones) {
    teacher.set(z.teacherId, { kind: "zone", zoneId: z.zoneId });
  }

  // Override: lunch
  for (const l of studentLunch) {
    if (!l.groupId) continue;
    student.set(l.studentId, { kind: "lunch", groupId: l.groupId });
  }
  for (const l of teacherLunch) {
    teacher.set(l.teacherId, { kind: "lunch", groupId: l.groupId });
  }

  // Override: activity
  for (const [teacherId, zoneId] of teacherZoneByTeacherId.entries()) {
    teacher.set(teacherId, { kind: "activity", zoneId });
  }
  for (const [studentId, zoneId] of studentZoneByStudentId.entries()) {
    student.set(studentId, { kind: "activity", zoneId });
  }

  return { student, teacher };
}

