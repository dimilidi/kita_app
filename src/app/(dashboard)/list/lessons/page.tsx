import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import {
  buildLessonListQuery,
  parsePaginationParams,
} from "@/lib/queryBuilder";
import LessonListClient from "./LessonListClient";

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();

  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildLessonListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    prisma.lesson.findMany({
      where,
      orderBy,
      include: {
        zone: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: limit,
      skip,
    }),
    prisma.lesson.count({ where }),
  ]);

  const [zones, classes, teachers] = await prisma.$transaction([
    prisma.zone.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
    }),
  ]);

  const relatedData = { zones, classes, teachers };

  const dataWithPlayArea = data.map((lesson) => ({
    ...lesson,
    playAreaName: lesson.zone?.name ?? "—",
  }));

  return (
    <LessonListClient
      data={dataWithPlayArea}
      count={count}
      page={page}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default LessonListPage;
