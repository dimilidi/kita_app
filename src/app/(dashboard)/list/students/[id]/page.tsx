import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
import FormContainer from "@/components/FormContainer";
import Performance, { FavouriteActivitySlice } from "@/components/Performance";
import SiblingShortcuts from "@/components/SiblingShortcuts";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";

const SingleStudentPage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const { role } = getAuthData();
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;
  const dateLocale = lang === "de" ? "de-DE" : "en-GB";

  const calcAge = (birthday: Date) => {
    const now = new Date();
    let age = now.getFullYear() - birthday.getFullYear();
    const m = now.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age--;
    return age;
  };

  // 0–3: Nursery (EN) / Krippe (DE); 3–6: Kindergarten
  const getAgeGroupLabel = (age: number) => {
    if (!Number.isFinite(age)) return "—";
    if (age >= 0 && age < 3) return dict.students?.groups?.nursery ?? "—";
    if (age >= 3 && age <= 6) return dict.students?.groups?.kindergarten ?? "—";
    return "—";
  };

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { include: { _count: { select: { lessons: true } } } },
      parent: {
        select: { name: true, surname: true, email: true, phone: true },
      },
    },
  });

  if (!student) {
    return notFound();
  }

  const siblings = await prisma.student.findMany({
    where: {
      parentId: student.parentId,
      id: { not: student.id },
    },
    select: { id: true, name: true, surname: true },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  // Pie chart slices: time spent per play area (zone) from ZoneHistory.
  const zoneHistory = await prisma.zoneHistory.findMany({
    where: { studentId: student.id },
    select: { movedAt: true, zoneId: true },
    orderBy: { movedAt: "asc" },
  });

  let favouriteActivities: FavouriteActivitySlice[] = [];

  if (zoneHistory.length > 0) {
    const zoneIds = Array.from(new Set(zoneHistory.map((z) => z.zoneId)));
    const zones = await prisma.zone.findMany({
      where: { id: { in: zoneIds } },
      select: { id: true, name: true },
    });
    const zoneNameById = new Map(zones.map((z) => [z.id, z.name]));

    const byZoneId = new Map<string, { name: string; value: number }>();
    const now = new Date();

    for (let i = 0; i < zoneHistory.length; i++) {
      const current = zoneHistory[i];
      const next = zoneHistory[i + 1];
      const end = next?.movedAt ?? now;

      const durationMs =
        end.getTime() - current.movedAt.getTime();
      if (durationMs <= 0) continue;

      const zoneName = zoneNameById.get(current.zoneId) ?? current.zoneId;
      const prev = byZoneId.get(current.zoneId);
      if (prev) {
        prev.value += durationMs;
      } else {
        byZoneId.set(current.zoneId, { name: zoneName, value: durationMs });
      }
    }

    const total = Array.from(byZoneId.values()).reduce(
      (s, x) => s + x.value,
      0
    );

    // Fallback: if timestamps are identical (or durations are all <= 0),
    // show simple visit counts instead of returning an empty chart.
    if (total === 0) {
      const counts = new Map<string, number>();
      for (const h of zoneHistory) {
        counts.set(h.zoneId, (counts.get(h.zoneId) ?? 0) + 1);
      }
      favouriteActivities = Array.from(counts.entries()).map(
        ([zoneId, count]) => ({
          name: zoneNameById.get(zoneId) ?? zoneId,
          value: count,
        })
      );
    } else {
      favouriteActivities = Array.from(byZoneId.values());
    }
  }

  const age = calcAge(student.birthday);
  const ageGroupLabel = getAgeGroupLabel(age);

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div className="bg-kitaSky py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="w-2/3 flex flex-col justify-start gap-2 min-w-0">
              <div className="flex items-center gap-4 min-w-0 flex-wrap">
                <h1 className="text-xl font-semibold break-words">
                  {student.name + " " + student.surname}
                </h1>
                {role === "admin" && (
                  <FormContainer table="student" type="update" data={student} />
                )}
              </div>
              <div className="flex items-left gap-2 flex-col text-xs font-medium">
                <div className="w-full flex items-center gap-2">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span className="break-words">{student.bloodType}</span>
                </div>

                <div className="w-full flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>
                    {new Intl.DateTimeFormat(dateLocale).format(student.birthday)}
                  </span>
                </div>

                <div className="w-full flex items-center gap-2">
                  <Image src="/parent.png" alt="" width={14} height={14} />
                  {role === "admin" || role === "teacher" ? (
                    <Link
                      href={`/list/parents/${student.parentId}`}
                      className="hover:underline text-left break-words"
                    >
                      {student.parent.name} {student.parent.surname}
                    </Link>
                  ) : (
                    <span className="break-words">
                      {student.parent.name} {student.parent.surname}
                    </span>
                  )}
                </div>

                <div className="w-full flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span className="break-words">{student.parent.email || "—"}</span>
                </div>

                <div className="w-full flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span className="break-words">{student.parent.phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS — same hierarchy as teacher single page: value (h1) then label */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm flex gap-3 items-start justify-start">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 shrink-0"
              />
              <div className="min-w-0">
                <Suspense fallback={<div className="text-sm text-gray-400">{dict.common.loading}</div>}>
                  <StudentAttendanceCard id={student.id} />
                </Suspense>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm flex gap-3 items-start justify-start">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg  font-semibold text-gray-900 leading-tight break-words">
                  {ageGroupLabel}
                </h1>
                <span className="text-xs sm:text-sm text-gray-400 break-words">
                  {dict.students.ageGroup}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm flex gap-3 items-start justify-start">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg  font-semibold text-gray-900 leading-tight">
                  {student.class._count.lessons}
                </h1>
                <span className="text-xs sm:text-sm text-gray-400">{dict.menu.lessons}</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm flex gap-3 items-start justify-start">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg  font-semibold text-gray-900 leading-tight truncate">
                  {student.class.name}
                </h1>
                <span className="text-xs sm:text-sm text-gray-400">{dict.menu.classes}</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>{dict.dashboard.weeklyActivities}</h1>
          <BigCalendarContainer type="classId" id={student.class.id} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">{dict.common.shortcuts}</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-kitaSkyLight"
              href={`/list/lessons?classId=${student.class.id}`}
            >
              {dict.menu.lessons}
            </Link>
            <Link
              className="p-3 rounded-md bg-kitaPurpleLight"
              href={`/list/teachers?classId=${student.class.id}`}
            >
              {dict.dashboard.educators}
            </Link>
            <SiblingShortcuts siblings={siblings} />
          </div>
        </div>
        <Performance activities={favouriteActivities} />
        <Announcements />
      </div>
    </div>
  );
};

export default SingleStudentPage;
