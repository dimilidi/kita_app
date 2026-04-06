import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
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
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="">
        {students.map((student) => (
          <div className="w-full xl:w-2/3" key={student.id}>
            <div className="h-full bg-white p-4 rounded-md">
              <h1 className="text-xl font-semibold">
                {dict.dashboard.schedule} ({student.name} {student.surname})
              </h1>
              <BigCalendarContainer type="classId" id={student.classId} />
            </div>
          </div>
        ))}
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;