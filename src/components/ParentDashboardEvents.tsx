import prisma from "@/lib/prisma";
import ParentDashboardEventsClient from "@/components/ParentDashboardEventsClient";
import { getAuthData } from "@/lib/utils";

type Child = { id: string; name: string; surname: string; classId: number };

/** Parent dashboard: calendar + upcoming events relevant to their children. */
export default async function ParentDashboardEvents({
  students,
}: {
  students: Child[];
}) {
  const { role, userId } = getAuthData();
  if (!userId || role !== "parent") {
    return <ParentDashboardEventsClient cards={[]} />;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const classIds = Array.from(new Set(students.map((c) => c.classId)));
  const childrenByClassId = new Map<number, Array<{ id: string; name: string }>>();
  for (const c of students) {
    const arr = childrenByClassId.get(c.classId);
    const label = `${c.name} ${c.surname}`.trim();
    if (arr) arr.push({ id: c.id, name: label });
    else childrenByClassId.set(c.classId, [{ id: c.id, name: label }]);
  }

  const rows = await prisma.event.findMany({
    where: {
      startTime: { gte: todayStart },
      OR: [{ classId: null }, { classId: { in: classIds } }],
    },
    orderBy: { startTime: "asc" },
    take: 3,
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      classId: true,
    },
  });

  const cards = rows.map((event, idx) => {
    const related =
      event.classId != null ? childrenByClassId.get(event.classId) ?? [] : [];
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      dateISO: event.startTime.toISOString(),
      isGlobal: event.classId == null,
      relatedChildren: related.map((c) => c.name),
      variantIndex: idx as 0 | 1 | 2,
    };
  });

  return <ParentDashboardEventsClient cards={cards} />;
}

