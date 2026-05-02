import {
  isWeekendDateStrUTC,
  normalizeAttendanceDateStr,
  parseDateStrToUtcRange,
  todayDateStrLocal,
} from "@/lib/attendanceDate";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { redirect } from "next/navigation";
import TeachersAttendanceClient from "./TeachersAttendanceClient";

export default async function TeachersAttendancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { userId, role } = getAuthData();
  if (role !== "admin" && role !== "teacher") {
    redirect(`/${DEFAULT_LOCALE}`);
  }

  const todayStr = todayDateStrLocal();
  const requested = searchParams.date;
  const viewerIsAdmin = role === "admin";

  // Teachers always use today (local); ignore date in URL.
  if (role === "teacher" && requested) {
    const params = new URLSearchParams();
    const search = searchParams.search;
    const status = searchParams.status;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const q = params.toString();
    redirect(q ? `?${q}` : "/list/teachers-attendance");
  }

  const dateStr =
    role === "teacher" ? todayStr : normalizeAttendanceDateStr(requested);

  // Prevent landing on weekend dates via URL (admins only).
  if (viewerIsAdmin && requested && requested !== dateStr) {
    const params = new URLSearchParams();
    params.set("date", dateStr);
    const search = searchParams.search;
    const status = searchParams.status;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    redirect(`?${params.toString()}`);
  }

  /** Admin: any working day. Teacher: self-service only on the current calendar day (local). */
  const canEdit =
    !isWeekendDateStrUTC(dateStr) &&
    (viewerIsAdmin || dateStr === todayStr);
  const rawSearch = typeof searchParams.search === "string" ? searchParams.search.trim() : "";
  const statusFilter =
    searchParams.status === "absent" ||
    searchParams.status === "checked_in" ||
    searchParams.status === "checked_out"
      ? (searchParams.status as "absent" | "checked_in" | "checked_out")
      : null;

  let teachers: {
    id: string;
    name: string;
    surname: string;
    img: string | null;
  }[] = [];
  const attendanceByTeacher: Record<
    string,
    { present: boolean; actualPickupTime: string | null }
  > = {};

  if (viewerIsAdmin || role === "teacher") {
    const range = parseDateStrToUtcRange(dateStr);
    if (range) {
      const ids: string[] = (
        await prisma.teacher.findMany({ select: { id: true } })
      ).map((t: { id: string }) => t.id);
      await (prisma as any).teacherAttendance.createMany({
        data: ids.map((id) => ({
          teacherId: id,
          date: range.start,
          present: false,
          actualPickupTime: null,
        })),
        skipDuplicates: true,
      });
    }

    const dayRange = parseDateStrToUtcRange(dateStr);
    const attendanceRows =
      dayRange != null
        ? await (prisma as any).teacherAttendance.findMany({
            where: { date: { gte: dayRange.start, lt: dayRange.end } },
            select: { teacherId: true, present: true, actualPickupTime: true },
          })
        : [];
    for (const row of attendanceRows as Array<{
      teacherId: string;
      present: boolean;
      actualPickupTime: string | null;
    }>) {
      attendanceByTeacher[row.teacherId] = {
        present: row.present,
        actualPickupTime: row.actualPickupTime ?? null,
      };
    }
    teachers = await prisma.teacher.findMany({
      orderBy: [{ name: "asc" }, { surname: "asc" }],
      select: { id: true, name: true, surname: true, img: true },
    });
  }

  const filteredTeachers =
    rawSearch.length === 0
      ? teachers
      : teachers.filter((t) => {
          const s = `${t.name} ${t.surname}`.toLowerCase();
          return s.includes(rawSearch.toLowerCase());
        });

  const finalTeachers =
    statusFilter == null
      ? filteredTeachers
      : filteredTeachers.filter((t) => {
          const a = attendanceByTeacher[t.id] ?? { present: false, actualPickupTime: null };
          const derived = !a.present
            ? "absent"
            : a.actualPickupTime
              ? "checked_out"
              : "checked_in";
          return derived === statusFilter;
        });

  return (
    <TeachersAttendanceClient
      dateStr={dateStr}
      teachers={finalTeachers}
      attendanceByTeacher={attendanceByTeacher}
      canEdit={canEdit}
      viewerIsAdmin={viewerIsAdmin}
      showDatePicker={viewerIsAdmin}
      editableTeacherId={viewerIsAdmin ? null : userId ?? null}
    />
  );
}
