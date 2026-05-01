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
  const search = rest.search;
  const sex = rest.sex;
  const status = rest.status;
  const p = page ? parseInt(page, 10) : 1;

  // Prevent landing on weekend dates via URL.
  const requested = rest.date;
  const normalized = normalizeAttendanceDateStr(requested);
  if (requested && requested !== normalized) {
    const params = new URLSearchParams();
    params.set("date", normalized);
    params.set("classId", classIdParam);
    if (search) params.set("search", search);
    if (sex) params.set("sex", sex);
    if (status) params.set("status", status);
    if (p) params.set("page", String(p));
    redirect(`?${params.toString()}`);
  }

  const data = await loadAttendancePageData({
    dateStr: rest.date,
    classIdParam,
    page: p,
    search,
    sex,
    status,
  });

  return (
    <AttendancePageClient
      viewerRole={data.viewerRole}
      dateStr={data.dateStr}
      classId={data.classIdParam}
      rows={data.rows}
      count={data.count}
      page={data.page}
      summary={data.summary}
      classes={data.classesForFilter}
      canEdit={data.canEdit && !isWeekendDateStrUTC(data.dateStr)}
      canRevertAbsent={data.canRevertAbsent && !isWeekendDateStrUTC(data.dateStr)}
    />
  );
}
