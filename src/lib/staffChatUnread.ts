import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/actionAuth";
import { getAuthData } from "@/lib/utils";
import { canAccessStaffChat } from "@/lib/chatPermissions";

export async function getUnreadStaffChatCount(): Promise<number> {
  const { userId, role } = getAuthData();
  if (!userId || !canAccessStaffChat(role)) return 0;

  const read = await prisma.staffChatRead.findUnique({
    where: { userId },
    select: { lastReadAt: true },
  });

  const lastReadAt = read?.lastReadAt ?? new Date(0);

  return prisma.message.count({
    where: {
      createdAt: { gt: lastReadAt },
      senderId: { not: userId },
    },
  });
}

export async function markStaffChatAsRead(): Promise<void> {
  const session = requireStaff();
  if (!session) return;
  const { userId } = session;

  await prisma.staffChatRead.upsert({
    where: { userId },
    create: { userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

