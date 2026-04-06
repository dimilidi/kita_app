import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import TeacherListClient from "./TeacherListClient";

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();
  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.TeacherWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lessons = {
              some: {
                classId: parseInt(value),
              },
            };
            break;
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.teacher.findMany({
      where: query,
      include: {
        lessons: { select: { name: true } },
        zones: { select: { zone: { select: { name: true } } } },
        classes: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.teacher.count({ where: query }),
  ]);

  const relatedData =
    role === "admin"
      ? {
          zones: await prisma.zone.findMany({ select: { id: true, name: true } }),
        }
      : undefined;

  return (
    <TeacherListClient
      data={data}
      count={count}
      page={p}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default TeacherListPage;