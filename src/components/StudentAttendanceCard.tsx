import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";

const StudentAttendanceCard = async ({ id }: { id: string }) => {
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  const attendance = await prisma.attendance.findMany({
    where: {
      studentId: id,
      date: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
  });

  const totalDays = attendance.length;
  const presentDays = attendance.filter((day) => day.present).length;
  const percentage =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;
  return (
    <div className="">
      <h1 className="text-xl font-semibold">
        {percentage !== null ? `${percentage}%` : "—"}
      </h1>
      <span className="text-sm text-gray-400">{dict.dashboard.attendance}</span>
    </div>
  );
};

export default StudentAttendanceCard;