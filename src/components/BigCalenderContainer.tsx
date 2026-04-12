import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalendar";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const dataRes = await prisma.lesson.findMany({
    where:
      type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number },
    include: {
      zone: { select: { name: true } },
    },
  });

  // Raw lesson times — `adjustScheduleToCurrentWeek` runs on the client so the
  // week matches the user’s local timezone and Monday-based week layout.
  const data = dataRes.map((lesson) => {
    const zoneName = lesson.zone?.name;
    return {
      title: zoneName ? `${lesson.name} - ${zoneName}` : lesson.name,
      start: lesson.startTime,
      end: lesson.endTime,
    };
  });

  return <BigCalendar data={data} />;
};

export default BigCalendarContainer;
