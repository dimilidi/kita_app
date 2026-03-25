import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import LunchGroupsManager from "./LunchGroupsManager";

const LunchGroupsPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();
  const { search } = searchParams;
  const query: Prisma.LunchGroupEntityWhereInput = {};

  if (search) {
    query.name = { contains: search, mode: "insensitive" };
  }

  const data = await (prisma as any).lunchGroupEntity.findMany({
    where: query,
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <LunchGroupsManager
        initialItems={data}
        canManage={role === "admin" || role === "teacher"}
      />
    </div>
  );
};

export default LunchGroupsPage;
