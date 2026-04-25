/** Polling interval for staff group chat (no WebSockets). */
export const CHAT_POLL_INTERVAL_MS = 3500;

export const CHAT_FETCH_LIMIT = 100;

export const CHAT_MAX_MESSAGE_CHARS = 8000;

export const CHAT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const CHAT_MAX_ATTACHMENTS_PER_MESSAGE = 5;

/** Allowed emoji reactions (toggle add/remove per user per emoji). */
export const CHAT_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "👏",
  "🙏",
] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

const MIME_IMAGE = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MIME_DOC = [
  "application/pdf",
] as const;

export const CHAT_ALLOWED_ATTACHMENT_MIMES = new Set<string>([
  ...MIME_IMAGE,
  ...MIME_DOC,
]);

function normalizeChatMime(mime: string): string {
  const raw = (mime || "").trim().toLowerCase();
  const m = raw.split(";", 1)[0].trim(); // drop charset / parameters
  if (!m) return "";
  // Cloudinary / browsers sometimes use common aliases.
  if (m === "image/jpg") return "image/jpeg";
  if (m === "application/x-pdf") return "application/pdf";
  if (m === "application/acrobat") return "application/pdf";
  if (m === "application/octet-stream") return "application/octet-stream";
  return m;
}

export function isAllowedChatMime(mime: string): boolean {
  const m = normalizeChatMime(mime);
  if (!m) return false;
  if (CHAT_ALLOWED_ATTACHMENT_MIMES.has(m)) return true;
  // Treat generic octet-stream as not allowed; the client should provide
  // a more specific mime derived from file extension / upload info.
  return false;
}

export function isChatImageMime(mime: string): boolean {
  const m = normalizeChatMime(mime);
  return m.startsWith("image/");
}
