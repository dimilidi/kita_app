import { normalizeAttendanceDateStr } from "@/lib/attendanceDate";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import prisma from "@/lib/prisma";
import {
  getTeacherAttendanceByDate,
  getTeacherAttendanceRowForTeacher,
} from "@/lib/teacherAttendance";
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

  const canEdit = true;
  const dateStr = normalizeAttendanceDateStr(searchParams.date);
  const viewerIsAdmin = role === "admin";

  let teachers: {
    id: string;
    name: string;
    surname: string;
    img: string | null;
  }[];
  const attendanceByTeacher: Record<string, boolean> = {};

  if (viewerIsAdmin) {
    const attendanceRows = await getTeacherAttendanceByDate(dateStr);
    for (const row of attendanceRows) {
      attendanceByTeacher[row.teacherId] = row.present;
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
      const row = await getTeacherAttendanceRowForTeacher(dateStr, userId);
      if (row) {
        attendanceByTeacher[row.teacherId] = row.present;
      }
    }
  }

  return (
    <TeachersAttendanceClient
      dateStr={dateStr}
      teachers={teachers}
      attendanceByTeacher={attendanceByTeacher}
      canEdit={canEdit}
      viewerIsAdmin={viewerIsAdmin}
    />
  );
}
