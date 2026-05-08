import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";
import { todayDateStrLocal, parseDateStrToUtcRange } from "@/lib/attendanceDate";
import { getEffectivePlacementNow } from "@/lib/effectivePlacementNow";
import ParentChildStatusCardClient from "@/components/parent/ParentChildStatusCardClient";
import ParentDashboardEvents from "@/components/ParentDashboardEvents";

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

  const [zones, lunchGroups, studentLunchLinks, attendanceRows] =
    await Promise.all([
      prisma.zone.findMany({ select: { id: true, name: true } }),
      prisma.lunchGroupEntity.findMany({ select: { id: true, name: true } }),
      prisma.studentLunchGroup.findMany({
        where: { studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true, groupId: true, movedAt: true },
      }),
      range
        ? prisma.attendance.findMany({
            where: {
              date: { gte: range.start, lt: range.end },
              studentId: { in: students.map((s) => s.id) },
            },
            select: {
              id: true,
              studentId: true,
              lessonId: true,
              present: true,
              actualPickupTime: true,
            },
          })
        : [],
    ]);

  const zoneNameById = new Map(zones.map((z) => [z.id, z.name]));
  const lunchNameById = new Map(lunchGroups.map((g) => [g.id, g.name]));
  /** Latest lunch assignment row per student (PK = studentId); movedAt is source of truth for “active today”. */
  const lunchLinkByStudentId = new Map(
    studentLunchLinks.map((l) => [l.studentId, l])
  );
  type AttendanceRow = {
    id: number;
    studentId: string;
    lessonId: number;
    present: boolean;
    actualPickupTime: string | null;
  };

  const attendanceByStudent = new Map<
    string,
    { present: boolean; actualPickupTime: string | null }
  >();
  const attendanceRowsTyped = attendanceRows as AttendanceRow[];
  /** Prefer latest row per student (highest id) when multiple exist for the same day */
  const sortedDesc = [...attendanceRowsTyped].sort((a, b) => b.id - a.id);
  const seenStudent = new Set<string>();
  for (const r of sortedDesc) {
    if (seenStudent.has(r.studentId)) continue;
    seenStudent.add(r.studentId);
    attendanceByStudent.set(r.studentId, {
      present: r.present,
      actualPickupTime: r.actualPickupTime ?? null,
    });
  }
  const studentIdsWithAttendanceToday = new Set(
    attendanceRowsTyped.map((r) => r.studentId)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row">
      {/* Schedules: full width of main column (not squeezed beside sidebar) */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-1 gap-4">
          {students.map((student) => {
            const hasAttendanceToday = studentIdsWithAttendanceToday.has(student.id);
            const att = attendanceByStudent.get(student.id);

            let attendanceStatus: "absent" | "checked_in" | "checked_out" | "no_record";
            let pickupTime: string | null = null;

            if (!hasAttendanceToday || !att) {
              attendanceStatus = "no_record";
              pickupTime = null;
            } else if (!att.present) {
              attendanceStatus = "absent";
              pickupTime = null;
            } else if (att.actualPickupTime) {
              attendanceStatus = "checked_out";
              pickupTime = att.actualPickupTime;
            } else {
              attendanceStatus = "checked_in";
              pickupTime = null;
            }

            const loc = effective.student.get(student.id) ?? { kind: "none" as const };
            /** Play area only while checked in (present, not picked up); never when absent, checked out, or no record */
            const playAreaLabel =
              attendanceStatus === "checked_in" &&
              (loc.kind === "zone" || loc.kind === "activity") &&
              loc.zoneId
                ? zoneNameById.get(loc.zoneId) ?? loc.zoneId
                : null;

            /** Lunch group only if assignment was moved today (local calendar) — not stale from previous days */
            const lunchLink = lunchLinkByStudentId.get(student.id);
            const movedToday =
              !!lunchLink &&
              lunchLink.movedAt.toLocaleDateString("en-CA") === dateStr;
            const assignedLunch =
              movedToday && lunchLink?.groupId
                ? lunchNameById.get(lunchLink.groupId) ?? lunchLink.groupId
                : null;
            const lunchGroupLabel =
              attendanceStatus === "absent" ? null : assignedLunch;

            return (
              <ParentChildStatusCardClient
                key={`status-${student.id}`}
                lang={lang === "en" ? "en" : "de"}
                student={{ id: student.id, name: student.name, surname: student.surname }}
                attendanceStatus={attendanceStatus}
                pickupTime={pickupTime}
                playAreaLabel={playAreaLabel}
                lunchGroupLabel={lunchGroupLabel}
                strings={{
                  titleToday: dict.dashboard?.todayOverview ?? "Today",
                  attendance: dict.dashboard?.attendanceStatus ?? "Attendance",
                  currentPlayArea: dict.dashboard?.currentPlayArea ?? "Current Play Area",
                  currentLunchGroup:
                    dict.dashboard?.currentLunchGroup ?? "Lunch group",
                  statusAbsent: dict.attendancePage?.statusAbsent ?? "Absent",
                  statusCheckedIn: dict.attendancePage?.statusCheckedIn ?? "Checked-in",
                  statusCheckedOut: dict.attendancePage?.statusCheckedOut ?? "Checked-out",
                  statusNoAttendanceToday:
                    dict.dashboard?.parentNoAttendanceToday ??
                    "No attendance recorded today",
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
        <ParentDashboardEvents students={students} />
        <Announcements />
      </aside>
    </div>
  );
};

export default ParentPage;