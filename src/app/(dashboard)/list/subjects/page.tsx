import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import SubjectListClient from "./SubjectListClient";

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { role } = getAuthData();

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.SubjectWhereInput = {};

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
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.subject.count({ where: query }),
  ]);

  const relatedData =
    role === "admin"
      ? {
          teachers: await prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
          }),
        }
      : undefined;

  return (
    <SubjectListClient
      data={data}
      count={count}
      page={p}
      role={role as string}
      relatedData={relatedData}
    />
  );
};

export default SubjectListPage;