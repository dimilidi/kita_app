import { getAuthData } from "@/lib/utils";
import { getPlayAreasExportSections } from "@/lib/playAreasExport";
import { buildZoneListQuery, parsePaginationParams } from "@/lib/queryBuilder";
import prisma from "@/lib/prisma";
import AreaListClient from "./AreaListClient";

export default async function AreasListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { role } = getAuthData();
  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildZoneListQuery(searchParams);

  const [data, count, exportSections] = await Promise.all([
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
    getPlayAreasExportSections(searchParams),
  ]);

  return (
    <AreaListClient
      data={data}
      exportSections={exportSections}
      count={count}
      page={page}
      role={role as string}
    />
  );
}
