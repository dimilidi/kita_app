import prisma from "@/lib/prisma";
import EventCalendarContainerClient from "./EventCalendarContainerClient";

const EventCalendarContainer = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { date } = searchParams;
  const d = date ? new Date(date) : new Date();

  const events = await prisma.event.findMany({
    where: {
      startTime: {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <EventCalendarContainerClient
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTimeISO: event.startTime.toISOString(),
      }))}
    />
  );
};

export default EventCalendarContainer;