import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import ClassListClient from "./ClassListClient";
import { buildClassListQuery, parsePaginationParams } from "@/lib/queryBuilder";

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();

  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildClassListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where,
      orderBy,
      include: {
        grade: true,
        supervisor: true,
      },
      take: limit,
      skip,
    }),
    prisma.class.count({ where }),
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
      page={page}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default ClassListPage;