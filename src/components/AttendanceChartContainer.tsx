import prisma from "@/lib/prisma";
import AttendanceChartContainerClient from "./AttendanceChartContainerClient";
import {
  aggregateEducatorAttendanceByMonFriWeekday,
  aggregateRowsByMonFriWeekday,
  getWeekMondayLocal,
  weekdayShortLabelsMonFri,
} from "@/lib/dashboardWeekAttendance";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/lang";

const AttendanceChartContainer = async () => {
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const intlLocale = lang === "de" ? "de-DE" : "en-GB";

  const today = new Date();
  const lastMonday = getWeekMondayLocal(today);

  const [childRows, teacherRows, totalEducators] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        date: { gte: lastMonday },
      },
      select: {
        date: true,
        present: true,
      },
    }),
    prisma.teacherAttendance.findMany({
      where: {
        date: { gte: lastMonday },
      },
      select: {
        date: true,
        present: true,
      },
    }),
    prisma.teacher.count(),
  ]);

  const daysOfWeek = weekdayShortLabelsMonFri(lastMonday, intlLocale);

  const childCounts = aggregateRowsByMonFriWeekday(childRows);
  const eduCounts = aggregateEducatorAttendanceByMonFriWeekday(
    teacherRows,
    totalEducators
  );

  const childrenData = daysOfWeek.map((name, idx) => ({
    name,
    present: childCounts[idx].present,
    absent: childCounts[idx].absent,
  }));

  const educatorData = daysOfWeek.map((name, idx) => ({
    name,
    present: eduCounts[idx].present,
    absent: eduCounts[idx].absent,
  }));

  const showEducatorOption = totalEducators > 0;

  return (
    <AttendanceChartContainerClient
      childrenData={childrenData}
      educatorData={educatorData}
      showEducatorOption={showEducatorOption}
    />
  );
};

export default AttendanceChartContainer;
