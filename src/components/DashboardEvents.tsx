import prisma from "@/lib/prisma";
import DashboardEventsClient from "./DashboardEventsClient";

/** Calendar + upcoming events list (same card UI as announcements). */
const DashboardEvents = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rows = await prisma.event.findMany({
    where: { startTime: { gte: todayStart } },
    orderBy: { startTime: "asc" },
    take: 3,
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
    },
  });

  const cards = rows.map((event, idx) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    dateISO: event.startTime.toISOString(),
    variantIndex: idx as 0 | 1 | 2,
  }));

  return <DashboardEventsClient cards={cards} />;
};

export default DashboardEvents;
