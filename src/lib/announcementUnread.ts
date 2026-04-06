import prisma from "@/lib/prisma";
import { announcementAccessWhere } from "@/lib/announcementVisibility";
import { getAuthData } from "@/lib/utils";

export async function getUnreadAnnouncementCount(): Promise<number> {
  const { userId, role } = getAuthData();
  if (!userId) {
    return 0;
  }

  const access = announcementAccessWhere(role, userId);

  return prisma.announcement.count({
    where: {
      AND: [
        access,
        {
          reads: {
            none: {
              userId,
            },
          },
        },
      ],
    },
  });
}
