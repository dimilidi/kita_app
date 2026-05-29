import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalenderContainer";
import FormContainer from "@/components/FormContainer";
import TeacherPlannedAreaCard from "@/components/TeacherPlannedAreaCard";
import { getCurrentPlacementNow } from "@/lib/currentPlacementNow";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canViewTeacherProfile, getViewerContext } from "@/lib/pageAccess";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";

const SingleTeacherPage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const viewer = getViewerContext();
  const { role, userId } = viewer;

  if (!canViewTeacherProfile(viewer, id)) {
    if (role === "teacher") {
      redirect("/list/teachers");
    }
    return notFound();
  }

  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  // 👉 Get teacher
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          lessons: true,
          classes: true,
        },
      },
    },
  });

  if (!teacher) {
    return notFound();
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [lessons, placementMap, attendanceRows] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId: teacher.id },
      select: {
        zoneId: true,
        classId: true,
        startTime: true,
        endTime: true,
      },
    }),
    getCurrentPlacementNow(),
    prisma.teacherAttendance.findMany({
      where: { teacherId: teacher.id, date: { gte: yearStart } },
      select: { date: true, present: true },
    }),
  ]);

  const groupCount = new Set(lessons.map((l) => l.classId)).size;

  const msByZoneId = new Map<string, number>();
  for (const lesson of lessons) {
    const ms = lesson.endTime.getTime() - lesson.startTime.getTime();
    if (!Number.isFinite(ms) || ms <= 0) continue;
    msByZoneId.set(lesson.zoneId, (msByZoneId.get(lesson.zoneId) ?? 0) + ms);
  }

  const zoneIdsForChart = Array.from(msByZoneId.keys());
  const zonesForChart =
    zoneIdsForChart.length > 0
      ? await prisma.zone.findMany({
          where: { id: { in: zoneIdsForChart } },
          select: { id: true, name: true },
        })
      : [];
  const zoneNameById = new Map(zonesForChart.map((z) => [z.id, z.name]));

  const distinctZonesWithLessons = new Set(lessons.map((l) => l.zoneId)).size;

  const activities = Array.from(msByZoneId)
    .map(([zoneId, value]) => ({
      name: zoneNameById.get(zoneId) ?? zoneId,
      value,
    }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const teacherClassIds = Array.from(new Set(lessons.map((l) => l.classId))).sort(
    (a, b) => a - b
  );
  const teacherClassIdsParam = teacherClassIds.join(",");

  const placement = placementMap.get(teacher.id) ?? { type: "pool", locked: false };
  let currentZoneDisplay: string;
  let currentBadgeLabel = "";

  const d = dict.dashboard;
  const badgePlay = d.currentAreaBadgePlayArea ?? "Play area";
  const badgeActivity = d.currentAreaBadgeActivity ?? "Activity";
  const badgePool = d.currentZonePool ?? "Pool";
  const badgeLunch = d.currentZoneLunchPrefix ?? "Lunch";

  if (placement.type === "pool") {
    currentZoneDisplay = badgePool;
    currentBadgeLabel = badgePool;
  } else if (placement.type === "zone") {
    currentZoneDisplay = placement.zoneName;
    currentBadgeLabel = badgePlay;
  } else if (placement.type === "lunch") {
    currentZoneDisplay = `${badgeLunch}: ${placement.groupName}`;
    currentBadgeLabel = badgeLunch;
  } else {
    const zoneRow = await prisma.zone.findUnique({
      where: { id: placement.zoneId },
      select: { name: true },
    });
    currentZoneDisplay = zoneRow?.name ?? placement.activityName;
    currentBadgeLabel = badgeActivity;
  }
  const weekdayRows = attendanceRows.filter((row) => {
    const dow = row.date.getUTCDay();
    return dow >= 1 && dow <= 5;
  });
  const totalDays = weekdayRows.length;
  const presentDays = weekdayRows.filter((r) => r.present).length;
  const attendancePercentage =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO */}
          <div className="bg-kitaSky py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={teacher.img || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>

            <div className="w-2/3 flex flex-col justify-between gap-4 min-w-0">
              <div className="flex items-center gap-4 min-w-0 flex-wrap">
                <h1 className="text-xl font-semibold break-words">
                  {teacher.name} {teacher.surname}
                </h1>
                {role === "admin" ? (
                  <FormContainer
                    table="teacher"
                    type="update"
                    data={teacher}
                    variant="admin"
                  />
                ) : role === "teacher" && userId && teacher.id === userId ? (
                  <FormContainer
                    table="teacher"
                    type="update"
                    data={teacher}
                    variant="self"
                  />
                ) : null}
              </div>

              {/* <p className="text-sm text-gray-500">
                {dict.common.about}
              </p> */}

              <div className="flex items-left  gap-2 flex-col text-xs font-medium">
                <div className="w-full flex items-center gap-2">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>{teacher.bloodType}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>
                    {new Intl.DateTimeFormat("en-GB").format(
                      teacher.birthday
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{teacher.email || "-"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{teacher.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SMALL CARDS */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {/* CARD */}
            <div className="bg-white p-3 rounded-md flex gap-3 items-start justify-start">
              <Image src="/singleAttendance.png" alt="" width={24} height={24} className="w-6 h-6"/>
              <div>
                <h1 className="text-xl font-semibold">
                  {attendancePercentage !== null ? `${attendancePercentage}%` : "—"}
                </h1>
                <span className="text-sm text-gray-400">
                  {dict.dashboard.attendance}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md flex gap-3 items-start justify-start">
              <Image src="/singleBranch.png" alt="" width={24} height={24} className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-semibold">
                  {distinctZonesWithLessons}
                </h1>
                <span className="text-sm text-gray-400">
                  {dict.menu.areas}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md flex gap-3 items-start justify-start">
              <Image src="/singleLesson.png" alt="" width={24} height={24} className="w-6 h-6"/>
              <div>
                <h1 className="text-xl font-semibold">
                  {teacher._count.lessons}
                </h1>
                <span className="text-sm text-gray-400">
                  {dict.menu.lessons}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md flex gap-3 items-start justify-start">
              <Image src="/singleClass.png" alt="" width={24} height={24} className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-semibold">
                  {groupCount}
                </h1>
                <span className="text-sm text-gray-400">
                  {dict.menu.classes}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SCHEDULE */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>{dict.dashboard.schedule}</h1>
          <BigCalendarContainer type="teacherId" id={teacher.id} />
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        {/* SHORTCUTS */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            {dict.common.shortcuts}
          </h1>

          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-kitaSkyLight"
              href={`/list/classes?supervisorId=${teacher.id}`}
            >
              {dict.menu.classes}
            </Link>

            <Link
              className="p-3 rounded-md bg-kitaPurpleLight"
              href={`/list/students?classIds=${teacherClassIdsParam}`}
            >
              {dict.dashboard.children}
            </Link>

            <Link
              className="p-3 rounded-md bg-kitaYellowLight"
              href={`/list/lessons?teacherId=${teacher.id}`}
            >
              {dict.menu.lessons}
            </Link>
          </div>
        </div>

        <TeacherPlannedAreaCard
          plannedActivities={activities}
          currentAreaLabel={currentZoneDisplay}
          currentBadgeLabel={currentBadgeLabel}
          strings={{
            plannedTitle:
              dict.dashboard.plannedTimeByPlayArea ?? "Planned Time by Play Area",
            plannedMenuLabel: dict.dashboard.plannedAreas ?? "Planned Areas",
            currentTitle: dict.dashboard.currentArea ?? "Current Area",
            overflowAria: dict.dashboard.chartMenu?.overflowAria ?? "Options",
            noPlanned:
              dict.dashboard.noPlannedActivityTime ??
              dict.dashboard.noAreaData ??
              "No planned activity time",
          }}
        />

        <Announcements />
      </div>
    </div>
  );
};

export default SingleTeacherPage;