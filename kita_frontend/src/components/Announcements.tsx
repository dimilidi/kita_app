import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";

import AnnouncementsClient from "./AnnouncementsClient";


const Announcements = async () => {

  const { userId, role } = getAuthData();

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: {
      ...(role !== "admin" && {
        OR: [
          { classId: null },
          { class: roleConditions[role as keyof typeof roleConditions] || {} },
        ],
      }),
    },
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