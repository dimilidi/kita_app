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
 * Computes effective play/activity placement only (manual StudentZone + Lesson-derived activity).
 * Lunch group assignment does NOT override zone/activity — educators move children manually on the play board.
 *
 * Priority:
 * - Activity zone (derived from active Lesson)
 * - else Play zone (stored StudentZone)
 */
export async function getEffectivePlacementNow(): Promise<EffectivePlacementNow> {
  const [{ teacherZoneByTeacherId, studentZoneByStudentId }, studentZones, teacherZones] =
    await Promise.all([
      getActiveActivityAssignmentsNow(),
      prisma.studentZone.findMany({ select: { studentId: true, zoneId: true } }),
      prisma.teacherZone.findMany({ select: { teacherId: true, zoneId: true } }),
    ]);

  const student = new Map<string, EffectiveLocation>();
  const teacher = new Map<string, EffectiveLocation>();

  for (const z of studentZones) {
    student.set(z.studentId, { kind: "zone", zoneId: z.zoneId });
  }
  for (const z of teacherZones) {
    teacher.set(z.teacherId, { kind: "zone", zoneId: z.zoneId });
  }

  for (const [teacherId, zoneId] of Array.from(teacherZoneByTeacherId.entries())) {
    teacher.set(teacherId, { kind: "activity", zoneId });
  }
  for (const [studentId, zoneId] of Array.from(studentZoneByStudentId.entries())) {
    student.set(studentId, { kind: "activity", zoneId });
  }

  return { student, teacher };
}
