import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import TischspruecheManager from "./TischspruecheManager";

const TischspruechePage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();

  const query: Prisma.TischspruchWhereInput = {};
  const { search } = searchParams;

  if (search) {
    query.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { text: { contains: search, mode: "insensitive" } },
    ];
  }

  const data = await prisma.tischspruch.findMany({
    where: query,
    orderBy: { createdAt: "desc" },
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
