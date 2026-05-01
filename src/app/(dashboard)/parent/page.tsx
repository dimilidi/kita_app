import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
import EventCalendar from "@/components/EventCalendar";
import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";
import { todayDateStrLocal, parseDateStrToUtcRange } from "@/lib/attendanceDate";
import { getEffectivePlacementNow } from "@/lib/effectivePlacementNow";
import ParentChildStatusCardClient from "@/components/parent/ParentChildStatusCardClient";

const ParentPage = async () => {
  const { userId } = getAuthData();

  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  const students = await prisma.student.findMany({
    where: {
      parentId: userId!,
    },
    select: { id: true, name: true, surname: true, classId: true },
  });

  const dateStr = todayDateStrLocal();
  const range = parseDateStrToUtcRange(dateStr);
  const effective = await getEffectivePlacementNow();

  const [zones, lunchGroups, lessonsByClass, attendanceRows] = await Promise.all([
    prisma.zone.findMany({ select: { id: true, name: true } }),
    (prisma as any).lunchGroupEntity.findMany({ select: { id: true, name: true } }),
    prisma.lesson.findMany({
      where: { classId: { in: Array.from(new Set(students.map((s) => s.classId))) } },
      orderBy: { startTime: "asc" },
      select: { id: true, classId: true },
    }),
    range
      ? prisma.attendance.findMany({
          where: {
            date: { gte: range.start, lt: range.end },
            studentId: { in: students.map((s) => s.id) },
          },
          select: { studentId: true, lessonId: true, present: true, actualPickupTime: true },
        })
      : [],
  ]);

  const zoneNameById = new Map(zones.map((z) => [z.id, z.name]));
  const lunchNameById = new Map(
    (lunchGroups as Array<{ id: string; name: string }>).map((g) => [g.id, g.name])
  );
  const firstLessonIdByClass = new Map<number, number>();
  for (const l of lessonsByClass) {
    if (!firstLessonIdByClass.has(l.classId)) firstLessonIdByClass.set(l.classId, l.id);
  }
  const attendanceByStudent = new Map<
    string,
    { present: boolean; actualPickupTime: string | null }
  >();
  for (const r of attendanceRows as Array<{
    studentId: string;
    lessonId: number;
    present: boolean;
    actualPickupTime: string | null;
  }>) {
    // keep latest by id order implicit; rows are not ordered but unique should exist per snapshot
    attendanceByStudent.set(r.studentId, {
      present: r.present,
      actualPickupTime: r.actualPickupTime ?? null,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row">
      {/* Schedules: full width of main column (not squeezed beside sidebar) */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-1 gap-4">
          {students.map((student) => {
            const att = attendanceByStudent.get(student.id) ?? {
              present: false,
              actualPickupTime: null,
            };
            const status = !att.present
              ? "absent"
              : att.actualPickupTime
                ? "checked_out"
                : "checked_in";

            const loc = effective.student.get(student.id) ?? { kind: "none" as const };
            const playAreaLabel =
              loc.kind === "zone" || loc.kind === "activity"
                ? (loc.zoneId ? zoneNameById.get(loc.zoneId) ?? loc.zoneId : null)
                : null;
            const lunchGroupLabel =
              loc.kind === "lunch"
                ? (loc.groupId ? lunchNameById.get(loc.groupId) ?? loc.groupId : null)
                : null;

            return (
              <ParentChildStatusCardClient
                key={`status-${student.id}`}
                lang={lang === "en" ? "en" : "de"}
                student={{ id: student.id, name: student.name, surname: student.surname }}
                attendanceStatus={status}
                pickupTime={att.actualPickupTime}
                playAreaLabel={playAreaLabel}
                lunchGroupLabel={lunchGroupLabel}
                strings={{
                  titleToday: dict.dashboard?.todayOverview ?? "Today",
                  attendance: dict.dashboard?.attendanceStatus ?? "Attendance",
                  currentPlayArea: dict.dashboard?.currentPlayArea ?? "Current Play Area",
                  currentLunchGroup: dict.dashboard?.currentLunchGroup ?? "Current Lunch Group",
                  statusAbsent: dict.attendancePage?.statusAbsent ?? "Absent",
                  statusCheckedIn: dict.attendancePage?.statusCheckedIn ?? "Checked-in",
                  statusCheckedOut: dict.attendancePage?.statusCheckedOut ?? "Checked-out",
                  reportAbsence: dict.dashboard?.reportAbsence ?? "Report absence",
                  sendMessage: dict.dashboard?.sendMessageKindergarten ?? "Send message",
                  absenceModalTitle:
                    dict.dashboard?.absenceReportTitle ?? "Report absence",
                  absenceOptionalNoteLabel:
                    dict.dashboard?.absenceOptionalNote ?? "Optional note",
                  absenceSend: dict.dashboard?.absenceSend ?? (dict.dashboard?.send ?? "Send"),
                  absenceSending:
                    dict.dashboard?.absenceSending ?? (dict.dashboard?.sending ?? "Sending…"),
                  absenceReportedSuccess:
                    dict.dashboard?.absenceReportedSuccess ??
                    "Absence reported successfully.",
                  messageModalTitle:
                    dict.dashboard?.messageKindergartenTitle ?? "Message kindergarten",
                  messageSubjectLabel: dict.dashboard?.messageSubject ?? "Subject",
                  messageLabel: dict.dashboard?.messageBody ?? "Message",
                  send: dict.dashboard?.send ?? "Send",
                  sending: dict.dashboard?.sending ?? "Sending…",
                  sentSuccess:
                    dict.dashboard?.messageSentSuccess ?? "Message sent.",
                  saveFailed: dict.attendancePage?.detailSaveFailed ?? "Could not save changes.",
                }}
              />
            );
          })}
        </div>

        {students.map((student) => (
          <div className="w-full" key={student.id}>
            <div className="flex min-h-[min(72vh,820px)] flex-col rounded-md bg-white p-4">
              <h1 className="shrink-0 text-xl font-semibold">
                {dict.dashboard.schedule} ({student.name} {student.surname})
              </h1>
              <div className="mt-2 min-h-0 flex-1">
                <BigCalendarContainer type="classId" id={student.classId} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar: fixed width on large screens so calendars keep most horizontal space */}
      <aside className="flex w-full shrink-0 flex-col gap-8 xl:w-80 xl:max-w-sm">
        <EventCalendar />
        <Announcements />
      </aside>
    </div>
  );
};

export default ParentPage;