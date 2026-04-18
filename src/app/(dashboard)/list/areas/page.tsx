import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import AreaListClient from "./AreaListClient";
import { buildZoneListQuery, parsePaginationParams } from "@/lib/queryBuilder";

export default async function AreasListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { role } = getAuthData();
  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildZoneListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    prisma.zone.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: { lessons: true },
        },
      },
      take: limit,
      skip,
    }),
    prisma.zone.count({ where }),
  ]);

  return (
    <AreaListClient
      data={data}
      count={count}
      page={page}
      role={role as string}
    />
  );
}
