import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import LessonListClient from "./LessonListClient";

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.LessonWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.classId = parseInt(value);
            break;
          case "teacherId":
            query.teacherId = value;
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { teacher: { name: { contains: value, mode: "insensitive" } } },
              {
                zone: {
                  name: { contains: value, mode: "insensitive" },
                },
              },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: query,
      include: {
        zone: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.lesson.count({ where: query }),
  ]);

  const [zones, classes, teachers] = await prisma.$transaction([
    prisma.zone.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({ select: { id: true, name: true } }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
    }),
  ]);

  const dataWithPlayArea = data.map((lesson) => ({
    ...lesson,
    playAreaName: lesson.zone?.name ?? "—",
  }));

  return (
    <LessonListClient
      data={dataWithPlayArea}
      count={count}
      page={p}
      role={role as string}
      relatedData={{ zones, classes, teachers }}
    />
  );
};

export default LessonListPage;
