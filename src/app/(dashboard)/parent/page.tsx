import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
import EventCalendar from "@/components/EventCalendar";
import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";

const ParentPage = async () => {
  const { userId } = getAuthData();

  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  const students = await prisma.student.findMany({
    where: {
      parentId: userId!,
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row">
      {/* Schedules: full width of main column (not squeezed beside sidebar) */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
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