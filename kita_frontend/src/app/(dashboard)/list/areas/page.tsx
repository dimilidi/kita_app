import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import AreaListClient from "./AreaListClient";

export default async function AreasListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { role } = getAuthData();
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page, 10) : 1;

  const query: Prisma.ZoneWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
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
    prisma.zone.findMany({
      where: query,
      include: {
        _count: {
          select: { lessons: true },
        },
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.zone.count({ where: query }),
  ]);

  return (
    <AreaListClient
      data={data}
      count={count}
      page={p}
      role={role as string}
    />
  );
}
