import { loadAttendancePageData } from "@/lib/attendancePageData";
import AttendancePageClient from "./AttendancePageClient";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { page, ...rest } = searchParams;
  const classIdParam = rest.classId ?? "all";
  const p = page ? parseInt(page, 10) : 1;

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
      canEdit={data.canEdit}
    />
  );
}
