import prisma from "@/lib/prisma";
import { announcementAccessWhere } from "@/lib/announcementVisibility";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Announcement, Class, Prisma } from "@prisma/client";
import AnnouncementListClient from "./AnnouncementListClient";


type AnnouncementList = Announcement & { class: Class };
const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, role } = getAuthData();

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.AnnouncementWhereInput = {
    ...announcementAccessWhere(role, userId),
  };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.title = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: query,
      include: {
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.announcement.count({ where: query }),
  ]);

  const classes = await prisma.class.findMany({ select: { id: true, name: true } });

  return (
    <AnnouncementListClient
      data={data}
      count={count}
      page={p}
      role={role as string}
      relatedData={{ classes }}
    />
  );
};

export default AnnouncementListPage;