import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import ParentListClient from "./ParentListClient";
import { buildParentListQuery, parsePaginationParams } from "@/lib/queryBuilder";

const ParentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();

  const { page, limit, skip } = parsePaginationParams(searchParams);
  const { where, orderBy } = buildParentListQuery(searchParams);

  const [data, count] = await prisma.$transaction([
    prisma.parent.findMany({
      where,
      orderBy,
      include: {
        students: true,
      },
      take: limit,
      skip,
    }),
    prisma.parent.count({ where }),
  ]);

  return (
    <ParentListClient
      data={data}
      count={count}
      page={page}
      role={role as string}
    />
  );
};

export default ParentListPage;