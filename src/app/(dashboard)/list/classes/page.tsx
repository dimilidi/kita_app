import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import ClassListClient from "./ClassListClient";

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "supervisorId":
            query.supervisorId = value;
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
    prisma.class.findMany({
      where: query,
      include: {
        grade: true,
        supervisor: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
  ]);

  const clientData = data.map((c) => ({
    id: c.id,
    name: c.name,
    capacity: c.capacity,
    gradeId: c.gradeId,
    supervisorId: c.supervisorId,
    grade: c.grade ? { id: c.grade.id, level: c.grade.level } : null,
    supervisor: c.supervisor ? { name: c.supervisor.name, surname: c.supervisor.surname } : null,
  }));

  const relatedData =
    role === "admin"
      ? {
          grades: await prisma.grade.findMany({
            where: { level: { in: [1, 2] } },
            select: { id: true, level: true },
            orderBy: { level: "asc" },
          }),
          teachers: await prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
          }),
        }
      : undefined;

  return (
    <ClassListClient
      data={clientData}
      count={count}
      page={p}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default ClassListPage;