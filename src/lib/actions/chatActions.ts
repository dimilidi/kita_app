"use server";

import prisma from "@/lib/prisma";
import {
  CHAT_MAX_ATTACHMENT_BYTES,
  CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CHAT_MAX_MESSAGE_CHARS,
  CHAT_REACTION_EMOJIS,
  isAllowedChatMime,
} from "@/lib/chatConstants";
import { requireStaff } from "@/lib/actionAuth";

export type ChatAttachmentInput = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function sendGroupMessage(payload: {
  content: string;
  attachments: ChatAttachmentInput[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = requireStaff();
  if (!session) {
    return { ok: false, error: "forbidden" };
  }
  const { userId, role } = session;

  const trimmed = payload.content.trim();
  const attachments = payload.attachments ?? [];
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[chat][server][sendGroupMessage] incoming", {
      userId,
      role,
      contentLength: trimmed.length,
      attachments,
    });
  }

  if (trimmed.length === 0 && attachments.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[chat][server][reject] empty");
    }
    return { ok: false, error: "empty" };
  }

  if (trimmed.length > CHAT_MAX_MESSAGE_CHARS) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[chat][server][reject] too_long", {
        len: trimmed.length,
        max: CHAT_MAX_MESSAGE_CHARS,
      });
    }
    return { ok: false, error: "too_long" };
  }

  if (attachments.length > CHAT_MAX_ATTACHMENTS_PER_MESSAGE) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[chat][server][reject] too_many_files", {
        count: attachments.length,
        max: CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
      });
    }
    return { ok: false, error: "too_many_files" };
  }

  for (const a of attachments) {
    if (
      !a.url?.startsWith("https://") ||
      typeof a.fileName !== "string" ||
      typeof a.mimeType !== "string" ||
      typeof a.sizeBytes !== "number"
    ) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[chat][server][reject] invalid_attachment", a);
      }
      return { ok: false, error: "invalid_attachment" };
    }
    if (!isAllowedChatMime(a.mimeType)) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[chat][server][reject] invalid_mime", {
          mimeType: a.mimeType,
          fileName: a.fileName,
          url: a.url,
        });
      }
      return { ok: false, error: "invalid_mime" };
    }
    if (a.sizeBytes > CHAT_MAX_ATTACHMENT_BYTES || a.sizeBytes < 1) {
    if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[chat][server][reject] file_too_large", {
          sizeBytes: a.sizeBytes,
          max: CHAT_MAX_ATTACHMENT_BYTES,
          fileName: a.fileName,
          mimeType: a.mimeType,
        });
      }
      return { ok: false, error: "file_too_large" };
    }
  }

  await prisma.message.create({
    data: {
      senderId: userId,
      content: trimmed,
      attachments: {
        create: attachments.map((a) => ({
          url: a.url,
          fileName: a.fileName.slice(0, 512),
          mimeType: a.mimeType.slice(0, 128),
          sizeBytes: a.sizeBytes,
        })),
      },
    },
  });

  return { ok: true };
}

export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = requireStaff();
  if (!session) {
    return { ok: false, error: "forbidden" };
  }
  const { userId } = session;

  if (
    !CHAT_REACTION_EMOJIS.includes(emoji as (typeof CHAT_REACTION_EMOJIS)[number])
  ) {
    return { ok: false, error: "invalid_emoji" };
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true },
  });
  if (!message) {
    return { ok: false, error: "not_found" };
  }

  const existing = await prisma.messageReaction.findFirst({
    where: { messageId, userId, emoji },
  });

  if (existing) {
    await prisma.messageReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  return { ok: true };
}

export async function editGroupMessage(payload: {
  messageId: string;
  content: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = requireStaff();
  if (!session) {
    return { ok: false, error: "forbidden" };
  }
  const { userId } = session;

  const messageId = payload.messageId;
  const trimmed = payload.content.trim();

  if (!messageId || typeof messageId !== "string") {
    return { ok: false, error: "invalid" };
  }
  if (trimmed.length === 0) {
    return { ok: false, error: "empty" };
  }
  if (trimmed.length > CHAT_MAX_MESSAGE_CHARS) {
    return { ok: false, error: "too_long" };
  }

  const updated = await prisma.message.updateMany({
    where: { id: messageId, senderId: userId },
    data: { content: trimmed, editedAt: new Date() },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true };
}

export async function deleteGroupMessage(payload: {
  messageId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = requireStaff();
  if (!session) {
    return { ok: false, error: "forbidden" };
  }
  const { userId } = session;

  const messageId = payload.messageId;
  if (!messageId || typeof messageId !== "string") {
    return { ok: false, error: "invalid" };
  }

  const res = await prisma.message.deleteMany({
    where: { id: messageId, senderId: userId },
  });
  if (res.count !== 1) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true };
}
