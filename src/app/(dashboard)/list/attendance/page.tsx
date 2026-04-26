import { loadAttendancePageData } from "@/lib/attendancePageData";
import AttendancePageClient from "./AttendancePageClient";
import { isWeekendDateStrUTC, normalizeAttendanceDateStr } from "@/lib/attendanceDate";
import { redirect } from "next/navigation";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { page, ...rest } = searchParams;
  const classIdParam = rest.classId ?? "all";
  const p = page ? parseInt(page, 10) : 1;

  // Prevent landing on weekend dates via URL.
  const requested = rest.date;
  const normalized = normalizeAttendanceDateStr(requested);
  if (requested && requested !== normalized) {
    redirect(
      `?date=${encodeURIComponent(normalized)}&classId=${encodeURIComponent(
        classIdParam
      )}${p ? `&page=${p}` : ""}`
    );
  }

  const data = await loadAttendancePageData({
    dateStr: rest.date,
    classIdParam,
    page: p,
  });

  return (
    <AttendancePageClient
      dateStr={data.dateStr}
      classId={data.classIdParam}
      rows={data.rows}
      count={data.count}
      page={data.page}
      summary={data.summary}
      classes={data.classesForFilter}
      canEdit={data.canEdit && !isWeekendDateStrUTC(data.dateStr)}
    />
  );
}
