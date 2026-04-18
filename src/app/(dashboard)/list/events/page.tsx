import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import EventListClient from "./EventListClient";
import {
  buildEventFiltersWhere,
  buildEventOrderBy,
  parsePaginationParams,
  parseSortOrder,
} from "@/lib/queryBuilder";

const EventListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, role } = getAuthData();

  const { page, limit, skip } = parsePaginationParams(searchParams);
  const filters = buildEventFiltersWhere(searchParams);
  const orderBy = buildEventOrderBy(
    searchParams.sort,
    parseSortOrder(searchParams.order)
  );

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  let where: Prisma.EventWhereInput;

  if (role === "admin") {
    where = filters;
  } else {
    where = {
      AND: [
        filters,
        {
          OR: [
            { classId: null },
            {
              class:
                roleConditions[role as keyof typeof roleConditions] || {
                  id: { in: [] },
                },
            },
          ],
        },
      ],
    };
  }

  const [data, count] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy,
      include: {
        class: true,
      },
      take: limit,
      skip,
    }),
    prisma.event.count({ where }),
  ]);

  const classes = await prisma.class.findMany({ select: { id: true, name: true } });

  return (
    <EventListClient
      data={data}
      count={count}
      page={page}
      role={role as string}
      relatedData={{ classes }}
    />
  );
};

export default EventListPage;
