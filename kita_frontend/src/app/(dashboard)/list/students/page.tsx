import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import StudentListClient from "./StudentListClient";

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.StudentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "teacherId":
            query.class = {
              lessons: {
                some: {
                  teacherId: value,
                },
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
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.student.count({ where: query }),
  ]);

  const relatedData =
    role === "admin"
      ? {
          grades: await prisma.grade.findMany({ select: { id: true, level: true } }),
          classes: await prisma.class.findMany({
            include: { _count: { select: { students: true } } },
          }),
          parents: await prisma.parent.findMany({
            select: { id: true, name: true, surname: true },
            orderBy: [{ surname: "asc" }, { name: "asc" }],
          }),
        }
      : undefined;

  return (
    <StudentListClient
      data={data}
      count={count}
      page={p}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default StudentListPage;