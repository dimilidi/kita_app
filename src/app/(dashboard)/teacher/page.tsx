import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
import TeacherTodayAttendanceCardClient from "@/components/teacher/TeacherTodayAttendanceCardClient";
import {
  formatCalendarDateStrLong,
  isWeekendDateStrUTC,
  parseDateStrToUtcRange,
  todayDateStrLocal,
} from "@/lib/attendanceDate";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";
import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { cookies } from "next/headers";

const TeacherPage = async () => {
  const { userId } = getAuthData();

  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  const dateStr = todayDateStrLocal();
  const range = parseDateStrToUtcRange(dateStr);
  let initialPresent = false;
  let initialPickup: string | null = null;
  if (userId && range) {
    await (prisma as any).teacherAttendance.createMany({
      data: [
        {
          teacherId: userId,
          date: range.start,
          present: false,
          actualPickupTime: null,
        },
      ],
      skipDuplicates: true,
    });
    const row = await (prisma as any).teacherAttendance.findFirst({
      where: {
        teacherId: userId,
        date: { gte: range.start, lt: range.end },
      },
      select: { present: true, actualPickupTime: true },
    });
    if (row) {
      initialPresent = row.present;
      initialPickup = row.actualPickupTime ?? null;
    }
  }
  const canEditCard = !isWeekendDateStrUTC(dateStr);
  const intlLocale = lang === "de" ? "de-DE" : "en-GB";
  const dateHeading = formatCalendarDateStrLong(dateStr, intlLocale);

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {userId ? (
          <TeacherTodayAttendanceCardClient
            teacherId={userId}
            dateStr={dateStr}
            initialPresent={initialPresent}
            initialPickupTime={initialPickup}
            canEdit={canEditCard}
            strings={{
              dateHeading,
              yourAttendance: dict.dashboard.educatorTodayAttendance,
              attendance: dict.dashboard.attendance,
              statusAbsent: dict.attendancePage.statusAbsent,
              statusCheckedIn: dict.attendancePage.statusCheckedIn,
              statusCheckedOut: dict.attendancePage.statusCheckedOut,
              actionCheckIn: dict.attendancePage.actionCheckIn,
              actionCheckOut: dict.attendancePage.actionCheckOut,
              saveFailed: dict.teacherAttendancePage.saveFailed,
            }}
          />
        ) : null}
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">{dict.dashboard.schedule}</h1>
          <BigCalendarContainer type="teacherId" id={userId!} />
        </div>
      </div>
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default TeacherPage;
