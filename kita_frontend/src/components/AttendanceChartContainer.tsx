import Image from "next/image";
import AttendanceChart from "./AttendanceChart";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";

const AttendanceChartContainer = async () => {
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const lastMonday = new Date(today);

  lastMonday.setDate(today.getDate() - daysSinceMonday);

  const resData = await prisma.attendance.findMany({
    where: {
      date: {
        gte: lastMonday,
      },
    },
    select: {
      date: true,
      present: true,
    },
  });

  // console.log(data)

  const intlLocale = lang === "de" ? "de-DE" : "en-GB";

  // Monday..Friday for this week (localized weekday short labels).
  const dayDates = Array.from({ length: 5 }, (_, idx) => {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + idx);
    return d;
  });
  const daysOfWeek = dayDates.map((d) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(d)
  );

  const attendanceCounts = Array.from({ length: 5 }, () => ({
    present: 0,
    absent: 0,
  }));

  resData.forEach((item) => {
    const itemDate = new Date(item.date);
    const dayOfWeek = itemDate.getDay();
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const idx = dayOfWeek - 1; // 0..4 => Mon..Fri
      if (item.present) {
        attendanceCounts[idx].present += 1;
      } else {
        attendanceCounts[idx].absent += 1;
      }
    }
  });

  const data = daysOfWeek.map((day, idx) => ({
    name: day,
    present: attendanceCounts[idx].present,
    absent: attendanceCounts[idx].absent,
  }));

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">{dict.dashboard.attendance}</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <AttendanceChart data={data}/>
    </div>
  );
};

export default AttendanceChartContainer;