import prisma from "@/lib/prisma";
import { announcementAccessWhere } from "@/lib/announcementVisibility";
import { getAuthData } from "@/lib/utils";

import AnnouncementsClient from "./AnnouncementsClient";


const Announcements = async () => {

  const { userId, role } = getAuthData();

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: announcementAccessWhere(role, userId),
  });

  const cards = data.map((item, idx) => ({
    title: item.title,
    description: item.description,
    dateISO: item.date.toISOString(),
    variantIndex: idx as 0 | 1 | 2,
  }));

  return <AnnouncementsClient cards={cards} />;
};

export default Announcements;