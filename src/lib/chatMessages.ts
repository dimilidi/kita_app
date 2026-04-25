import prisma from "@/lib/prisma";
import type {
  Message,
  MessageAttachment,
  MessageReaction,
} from "@prisma/client";
import {
  CHAT_FETCH_LIMIT,
  CHAT_REACTION_EMOJIS,
} from "@/lib/chatConstants";

export type ChatAttachmentPayload = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
};

export type ChatReactionPayload = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessagePayload = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  attachments: ChatAttachmentPayload[];
  reactions: ChatReactionPayload[];
};

const reactionSet = new Set<string>(CHAT_REACTION_EMOJIS);

function aggregateReactions(
  reactions: MessageReaction[],
  currentUserId: string
): ChatReactionPayload[] {
  const byEmoji = new Map<string, Set<string>>();
  for (const r of reactions) {
    if (!reactionSet.has(r.emoji)) continue;
    let set = byEmoji.get(r.emoji);
    if (!set) {
      set = new Set();
      byEmoji.set(r.emoji, set);
    }
    set.add(r.userId);
  }
  return Array.from(byEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reactedByMe: users.has(currentUserId),
  }));
}

export async function resolveSenderDisplayNames(
  ids: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const [teachers, admins] = await Promise.all([
    prisma.teacher.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, surname: true },
    }),
    prisma.admin.findMany({
      where: { id: { in: unique } },
      select: { id: true, username: true },
    }),
  ]);

  for (const t of teachers) {
    map.set(t.id, `${t.name} ${t.surname}`);
  }
  for (const a of admins) {
    map.set(a.id, a.username);
  }
  for (const id of unique) {
    // Only admins + teachers can post in staff chat. If we can't resolve
    // the sender in either table, prefer showing "Admin" over "Unknown"
    // (admins may exist in auth without a local Admin row).
    if (!map.has(id)) map.set(id, "Admin");
  }
  return map;
}

function toPayload(
  m: Message & {
    attachments: MessageAttachment[];
    reactions: MessageReaction[];
  },
  senderName: string,
  currentUserId: string
): ChatMessagePayload {
  return {
    id: m.id,
    content: m.content,
    senderId: m.senderId,
    senderName,
    createdAt: m.createdAt.toISOString(),
    attachments: m.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      fileName: a.fileName,
      mimeType: a.mimeType,
    })),
    reactions: aggregateReactions(m.reactions, currentUserId),
  };
}

/** Latest messages (chronological), capped for the group chat view. */
export async function fetchStaffChatMessagesPayload(
  currentUserId: string
): Promise<{ messages: ChatMessagePayload[] }> {
  const rows = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: CHAT_FETCH_LIMIT,
    include: {
      attachments: true,
      reactions: true,
    },
  });

  const chronological = [...rows].reverse();
  const senderIds = chronological.map((m) => m.senderId);
  const names = await resolveSenderDisplayNames(senderIds);

  const messages = chronological.map((m) =>
    toPayload(m, names.get(m.senderId) ?? "Admin", currentUserId)
  );

  return { messages };
}
