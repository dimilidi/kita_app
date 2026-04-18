import prisma from "@/lib/prisma";
import type { PlayAreaPdfSection } from "@/types/playAreas";
import { buildZoneListQuery } from "@/lib/queryBuilder";

/**
 * Full play-area export for print/PDF: same filters/sort as the list, no pagination.
 * Activities = unique names from `Activity` rows plus scheduled `Lesson` titles in this zone.
 */
export async function getPlayAreasExportSections(
  searchParams: { [key: string]: string | undefined }
): Promise<PlayAreaPdfSection[]> {
  const { where, orderBy } = buildZoneListQuery(searchParams);

  const zones = await prisma.zone.findMany({
    where,
    orderBy,
    include: {
      teachers: {
        include: {
          teacher: { select: { name: true, surname: true } },
        },
      },
      activities: { orderBy: { name: "asc" } },
      lessons: { select: { name: true } },
      students: {
        include: {
          student: {
            include: { class: { select: { name: true } } },
          },
        },
      },
    },
  });

  return zones.map((z) => {
    const activityNames = Array.from(
      new Set([
        ...z.activities.map((a) => a.name),
        ...z.lessons.map((l) => l.name),
      ])
    ).sort((a, b) => a.localeCompare(b));

    return {
      areaName: z.name,
      capacity: z.capacity,
      educatorNames: z.teachers
        .map((tz) => `${tz.teacher.name} ${tz.teacher.surname}`.trim())
        .sort((a, b) => a.localeCompare(b)),
      activityNames,
      children: [...z.students]
        .map((sz) => sz.student)
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name) || a.surname.localeCompare(b.surname)
        )
        .map((s) => ({
          name: `${s.name} ${s.surname}`.trim(),
          className: s.class.name,
        })),
    };
  });
}
