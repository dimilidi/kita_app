import prisma from "@/lib/prisma";

export type DeleteZoneResult =
  | { ok: true }
  | { ok: false; reason: "in_use" | "not_found" };

/**
 * Deletes a play area when it has no current board placements and no scheduled lessons/activities.
 * Past movement history is removed automatically on delete.
 */
export async function deleteZoneById(zoneId: string): Promise<DeleteZoneResult> {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { id: true },
  });
  if (!zone) {
    return { ok: false, reason: "not_found" };
  }

  const [lessonCount, activityCount, studentPlacementCount, teacherPlacementCount] =
    await Promise.all([
      prisma.lesson.count({ where: { zoneId } }),
      prisma.activity.count({ where: { zoneId } }),
      prisma.studentZone.count({ where: { zoneId } }),
      prisma.teacherZone.count({ where: { zoneId } }),
    ]);

  if (
    lessonCount + activityCount > 0 ||
    studentPlacementCount + teacherPlacementCount > 0
  ) {
    return { ok: false, reason: "in_use" };
  }

  await prisma.$transaction([
    prisma.zoneHistory.deleteMany({ where: { zoneId } }),
    prisma.zone.delete({ where: { id: zoneId } }),
  ]);

  return { ok: true };
}
