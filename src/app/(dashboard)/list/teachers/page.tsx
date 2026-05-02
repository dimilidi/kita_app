import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import TeacherListClient from "./TeacherListClient";
import { buildTeacherListQuery, parsePaginationParams } from "@/lib/queryBuilder";
import { Prisma } from "@prisma/client";

const adminInclude = {
  lessons: {
    select: {
      id: true,
      name: true,
      class: { select: { id: true, name: true } },
    },
  },
  classes: { select: { id: true, name: true } },
  zones: { select: { zone: { select: { name: true } } } },
} satisfies Prisma.TeacherInclude;

const teacherListSelect = {
  id: true,
  name: true,
  surname: true,
  img: true,
  lessons: {
    select: {
      id: true,
      name: true,
      class: { select: { id: true, name: true } },
    },
  },
  classes: { select: { id: true, name: true } },
} satisfies Prisma.TeacherSelect;

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();
  const isAdmin = role === "admin";
  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildTeacherListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    isAdmin
      ? prisma.teacher.findMany({
          where,
          orderBy,
          include: adminInclude,
          take: limit,
          skip,
        })
      : prisma.teacher.findMany({
          where,
          orderBy,
          select: teacherListSelect,
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
      data={data as any[]}
      count={count}
      page={page}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default TeacherListPage;
