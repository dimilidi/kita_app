import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { buildTischspruchListQuery } from "@/lib/queryBuilder";
import TischspruecheManager from "./TischspruecheManager";

const TischspruechePage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();

  const { where, orderBy } = buildTischspruchListQuery(searchParams);

  const data = await prisma.tischspruch.findMany({
    where,
    orderBy,
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <TischspruecheManager
        initialItems={data}
        canManage={role === "admin" || role === "teacher"}
      />
    </div>
  );
};

export default TischspruechePage;
