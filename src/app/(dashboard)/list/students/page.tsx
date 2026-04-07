import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import StudentListClient from "./StudentListClient";

/** Classes this teacher is responsible for: supervised + any class where they have a lesson. */
async function classIdsForTeacher(teacherId: string): Promise<number[]> {
  const [supervised, lessonRows] = await Promise.all([
    prisma.class.findMany({
      where: { supervisorId: teacherId },
      select: { id: true },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      select: { classId: true },
    }),
  ]);
  const merged = [
    ...supervised.map((c) => c.id),
    ...lessonRows.map((l) => l.classId),
  ];
  return Array.from(new Set(merged));
}

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.StudentWhereInput = {};

  if (queryParams.teacherId) {
    const classIds = await classIdsForTeacher(queryParams.teacherId);
    if (classIds.length > 0) {
      query.classId = { in: classIds };
    } else {
      query.id = { in: [] };
    }
  } else if (queryParams.classIds) {
    const ids = queryParams.classIds
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length > 0) {
      query.classId = { in: ids };
    } else {
      // Explicitly requested classIds but none are valid -> show no students.
      query.id = { in: [] };
    }
  }

  if (queryParams.search) {
    query.name = { contains: queryParams.search, mode: "insensitive" };
  }

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
        parent: { select: { name: true, surname: true, phone: true, address: true } },
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