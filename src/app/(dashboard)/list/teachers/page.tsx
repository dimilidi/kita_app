import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import TeacherListClient from "./TeacherListClient";
import { buildTeacherListQuery, parsePaginationParams } from "@/lib/queryBuilder";

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();
  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildTeacherListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    prisma.teacher.findMany({
      where,
      orderBy,
      include: {
        lessons: {
          select: {
            id: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
        classes: { select: { id: true, name: true } },
      },
      take: limit,
      skip,
    }),
    prisma.teacher.count({ where }),
  ]);

  const [zones, classes, lessons] = await prisma.$transaction([
    prisma.zone.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lesson.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const relatedData = { zones, classes, lessons };

  return (
    <TeacherListClient
      data={data}
      count={count}
      page={page}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default TeacherListPage;