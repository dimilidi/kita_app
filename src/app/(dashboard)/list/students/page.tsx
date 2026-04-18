import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import StudentListClient from "./StudentListClient";
import { buildStudentListQuery, parsePaginationParams } from "@/lib/queryBuilder";

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();

  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = await buildStudentListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      orderBy,
      include: {
        class: true,
        parent: { select: { name: true, surname: true, phone: true, address: true } },
      },
      take: limit,
      skip,
    }),
    prisma.student.count({ where }),
  ]);

  const relatedData =
    role === "admin"
      ? {
          grades: await prisma.grade.findMany({ select: { id: true, level: true } }),
          classes: await prisma.class.findMany({
            include: { _count: { select: { students: true } } },
          }),
          lunchGroups: await prisma.lunchGroupEntity.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
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
      page={page}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default StudentListPage;