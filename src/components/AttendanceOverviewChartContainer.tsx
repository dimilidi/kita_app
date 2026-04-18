import AttendanceOverviewChart from "@/components/AttendanceOverviewChart";
import {
  loadAttendanceOverviewMonthUTC,
  loadAttendanceOverviewYearUTC,
} from "@/lib/attendanceOverviewStats";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/lang";

export default async function AttendanceOverviewChartContainer() {
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const intlLocale = lang === "de" ? "de-DE" : "en-GB";

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const [monthSeries, yearSeriesRaw] = await Promise.all([
    loadAttendanceOverviewMonthUTC(year, month),
    loadAttendanceOverviewYearUTC(year),
  ]);

  const yearSeries = yearSeriesRaw.map((row, mi) => ({
    ...row,
    label: new Intl.DateTimeFormat(intlLocale, { month: "short" }).format(
      new Date(Date.UTC(year, mi, 1))
    ),
  }));

  return (
    <AttendanceOverviewChart monthData={monthSeries} yearData={yearSeries} />
  );
}
