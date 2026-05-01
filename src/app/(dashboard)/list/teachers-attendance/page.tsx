import {
  isWeekendDateStrUTC,
  normalizeAttendanceDateStr,
  parseDateStrToUtcRange,
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

  // Prevent landing on weekend dates via URL.
  const requested = searchParams.date;
  const dateStr = normalizeAttendanceDateStr(requested);
  if (requested && requested !== dateStr) {
    const params = new URLSearchParams();
    params.set("date", dateStr);
    const search = searchParams.search;
    const status = searchParams.status;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    redirect(`?${params.toString()}`);
  }
  const canEdit = !isWeekendDateStrUTC(dateStr);
  const viewerIsAdmin = role === "admin";
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
  }[];
  const attendanceByTeacher: Record<
    string,
    { present: boolean; actualPickupTime: string | null }
  > = {};

  if (viewerIsAdmin) {
    // Ensure a complete daily record exists for all teachers for this day
    // (missing rows default to present=false). This keeps charts consistent:
    // present = count(true), absent = count(false), no missing rows.
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
  } else {
    if (!userId) {
      teachers = [];
    } else {
      const me = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { id: true, name: true, surname: true, img: true },
      });
      teachers = me ? [me] : [];
      const dayRange = parseDateStrToUtcRange(dateStr);
      const row =
        dayRange != null
          ? await (prisma as any).teacherAttendance.findFirst({
              where: {
                teacherId: userId,
                date: { gte: dayRange.start, lt: dayRange.end },
              },
              select: { teacherId: true, present: true, actualPickupTime: true },
            })
          : null;
      if (row) {
        attendanceByTeacher[row.teacherId] = {
          present: row.present,
          actualPickupTime: row.actualPickupTime ?? null,
        };
      }
    }
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
    />
  );
}
