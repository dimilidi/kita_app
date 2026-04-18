import prisma from "@/lib/prisma";
import { announcementAccessWhere } from "@/lib/announcementVisibility";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import AnnouncementListClient from "./AnnouncementListClient";
import {
  buildAnnouncementFiltersWhere,
  buildAnnouncementOrderBy,
  parsePaginationParams,
  parseSortOrder,
} from "@/lib/queryBuilder";

const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, role } = getAuthData();

  const { page, limit, skip } = parsePaginationParams(searchParams);
  const filters = buildAnnouncementFiltersWhere(searchParams);
  const access = announcementAccessWhere(role, userId);

  const where: Prisma.AnnouncementWhereInput =
    Object.keys(filters).length === 0
      ? access
      : Object.keys(access).length === 0
        ? filters
        : { AND: [access, filters] };

  const orderBy = buildAnnouncementOrderBy(
    searchParams.sort,
    parseSortOrder(searchParams.order)
  );

  const [data, count] = await prisma.$transaction([
    prisma.announcement.findMany({
      where,
      orderBy,
      include: {
        class: true,
      },
      take: limit,
      skip,
    }),
    prisma.announcement.count({ where }),
  ]);

  const classes = await prisma.class.findMany({ select: { id: true, name: true } });

  return (
    <AnnouncementListClient
      data={data}
      count={count}
      page={page}
      role={role as string}
      relatedData={{ classes }}
    />
  );
};

export default AnnouncementListPage;
