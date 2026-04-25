"use client";

import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import {
  CHAT_MAX_ATTACHMENT_BYTES,
  CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CHAT_POLL_INTERVAL_MS,
  CHAT_REACTION_EMOJIS,
  isAllowedChatMime,
  isChatImageMime,
} from "@/lib/chatConstants";
import type { ChatMessagePayload } from "@/lib/chatMessages";
import {
  deleteGroupMessage,
  editGroupMessage,
  sendGroupMessage,
  toggleMessageReaction,
  type ChatAttachmentInput,
} from "@/lib/actions/chatActions";
import { useTranslations } from "@/i18n/TranslationsProvider";

type PendingAttachment = ChatAttachmentInput;

const EMOJI_SECTIONS: { id: string; label: string; emojis: string[] }[] = [
  {
    id: "recent",
    label: "🙂",
    emojis: ["👍", "❤️", "😂", "😮", "👏", "🙏"],
  },
  {
    id: "smileys",
    label: "😄",
    emojis: [
      "😀",
      "😁",
      "😅",
      "😂",
      "🤣",
      "😊",
      "🙂",
      "😉",
      "😍",
      "😘",
      "😋",
      "😎",
      "🥳",
      "🤩",
      "😇",
      "🤔",
      "😴",
      "😮",
      "😢",
      "😭",
      "😡",
      "🤯",
      "🤗",
      "😬",
      "🙃",
      "😶‍🌫️",
    ],
  },
  {
    id: "gestures",
    label: "👍",
    emojis: [
      "👍",
      "👎",
      "👌",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "👏",
      "🙏",
      "🙌",
      "💪",
      "👋",
      "🤝",
      "🫶",
    ],
  },
  {
    id: "hearts",
    label: "❤️",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕"],
  },
  {
    id: "family",
    label: "👶",
    emojis: ["👶", "🧒", "👦", "👧", "🧑", "👩", "👨", "👵", "👴", "🧑‍🏫"],
  },
  {
    id: "animals",
    label: "🐶",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"],
  },
  {
    id: "food",
    label: "🍎",
    emojis: ["🍎", "🍌", "🍇", "🍓", "🍉", "🍞", "🧀", "🥨", "🍪", "🍰", "🍫", "☕"],
  },
  {
    id: "objects",
    label: "📎",
    emojis: ["📎", "📌", "✏️", "🖍️", "📚", "🧸", "🎈", "🎁", "🧼", "🧻", "🍼"],
  },
  {
    id: "symbols",
    label: "✨",
    emojis: ["✨", "✅", "❌", "⚠️", "⭐", "🔥", "💡", "🎉", "🔔", "📣", "❓"],
  },
];

function guessMimeFromCloudinaryInfo(info: {
  mime_type?: string;
  resource_type?: string;
  format?: string;
  secure_url?: string;
}): string {
  const normalize = (mime: string): string => {
    const raw = (mime || "").trim().toLowerCase();
    const m = raw.split(";", 1)[0].trim(); // drop charset / parameters
    if (!m) return "";
    if (m === "image/jpg") return "image/jpeg";
    if (m === "application/x-pdf") return "application/pdf";
    if (m === "application/acrobat") return "application/pdf";
    // Some upload flows mislabel PDFs as image/pdf; treat as a PDF.
    if (m === "image/pdf") return "application/pdf";
    return m;
  };

  // PDF must always be application/pdf, regardless of resource_type.
  const fmt = (info.format || "").toLowerCase();
  if (fmt === "pdf") return "application/pdf";

  if (info.mime_type && typeof info.mime_type === "string") {
    const m = normalize(info.mime_type);
    if (m) return m;
  }
  const url = (info.secure_url || "").toLowerCase();
  const urlPath = url.split("?")[0].split("#")[0];
  if (info.resource_type === "image") {
    const ext = fmt === "jpg" || fmt === "jpeg" ? "jpeg" : fmt || "jpeg";
    return normalize(`image/${ext}`);
  }
  if (fmt === "pdf" || urlPath.endsWith(".pdf")) return "application/pdf";
  if (fmt === "png" || urlPath.endsWith(".png")) return "image/png";
  if (fmt === "webp" || urlPath.endsWith(".webp")) return "image/webp";
  if (
    fmt === "jpg" ||
    fmt === "jpeg" ||
    urlPath.endsWith(".jpg") ||
    urlPath.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }
  return "";
}

export default function GroupChatClient({
  initialMessages,
  currentUserId,
}: {
  initialMessages: ChatMessagePayload[];
  currentUserId: string;
}) {
  const dict = useTranslations();
  const chat = dict.staffChat as Record<string, string>;
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const shouldAutoScrollNextRef = useRef(false);
  const scrollBehaviorNextRef = useRef<ScrollBehavior>("auto");

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    // Stricter threshold to avoid "jump" from small height changes.
    const thresholdPx = 32;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= thresholdPx;
  };

  const [messages, setMessages] =
    useState<ChatMessagePayload[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRootRef = useRef<HTMLDivElement>(null);
  const [reactionBarFor, setReactionBarFor] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessagePayload[] };
      // Auto-scroll only if user was already near bottom (polling).
      shouldAutoScrollNextRef.current = isNearBottom();
      scrollBehaviorNextRef.current = "auto";
      setMessages(data.messages);
    } catch {
      /* ignore transient poll failures */
    }
  }, []);

  useEffect(() => {
    if (!openMenuFor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.closest("[data-chat-message-menu='true']")) return;
      setOpenMenuFor(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openMenuFor]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = emojiRootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setEmojiOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  useEffect(() => {
    if (!reactionBarFor) return;
    const onDown = (e: MouseEvent | PointerEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.closest("[data-reaction-root='true']")) return;
      setReactionBarFor(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [reactionBarFor]);

  useEffect(() => {
    const id = window.setInterval(refresh, CHAT_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useLayoutEffect(() => {
    if (!shouldAutoScrollNextRef.current) return;
    scrollToBottom(scrollBehaviorNextRef.current);
    shouldAutoScrollNextRef.current = false;
  }, [messages]);

  const onScrollList = () => {
    const el = listRef.current;
    if (!el) return;
    // Keep this in sync with isNearBottom().
    stickToBottomRef.current = isNearBottom();
  };

  const addPendingFromUpload = useCallback(
    (info: {
      secure_url?: string;
      bytes?: number;
      original_filename?: string;
      resource_type?: string;
      format?: string;
      mime_type?: string;
    }) => {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[chat][upload][cloudinary info]", info);
      }
      const url = info.secure_url;
      const bytes = typeof info.bytes === "number" ? info.bytes : 0;
      if (!url) {
        toast(chat.errorSend);
        return;
      }
      if (bytes > CHAT_MAX_ATTACHMENT_BYTES) {
        toast(chat.fileTooLarge);
        return;
      }
      let mime = guessMimeFromCloudinaryInfo(info);
      if (!mime) {
        const name = (info.original_filename || "").toLowerCase();
        if (name.endsWith(".pdf")) mime = "application/pdf";
        else if (name.endsWith(".png")) mime = "image/png";
        else if (name.endsWith(".webp")) mime = "image/webp";
        else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mime = "image/jpeg";
      }
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[chat][upload][derived]", {
          derivedMime: mime,
          secure_url: url,
          bytes,
          original_filename: info.original_filename,
          format: info.format,
          resource_type: info.resource_type,
          mime_type: info.mime_type,
        });
      }
      if (!mime || !isAllowedChatMime(mime)) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[chat][upload][rejected by client validation]", {
            mime,
            allowed: !!mime && isAllowedChatMime(mime),
          });
        }
        toast(chat.invalidFile);
        return;
      }
      setPending((prev) => {
        if (prev.length >= CHAT_MAX_ATTACHMENTS_PER_MESSAGE) {
          toast(chat.tooManyFiles);
          return prev;
        }
        const next = [
          ...prev,
          {
            url,
            fileName:
              (info.original_filename as string | undefined)?.slice(0, 240) ||
              "file",
            mimeType: mime,
            sizeBytes: bytes || 1,
          },
        ];
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[chat][pending][after add]", next);
        }
        return next;
      });
    },
    [chat]
  );

  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed && pending.length === 0) {
      toast(chat.errorEmpty);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[chat][send][payload]", {
        contentLength: trimmed.length,
        attachments: pending,
      });
    }
    setSending(true);
    try {
      const result = await sendGroupMessage({
        content: trimmed,
        attachments: pending,
      });
      if (!result.ok) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[chat][send][server rejected]", result);
        }
        if (result.error === "empty") toast(chat.errorEmpty);
        else if (result.error === "too_many_files") toast(chat.tooManyFiles);
        else if (result.error === "file_too_large") toast(chat.fileTooLarge);
        else if (result.error === "invalid_mime") toast(chat.invalidFile);
        else toast(chat.errorSend);
        return;
      }
      setText("");
      setPending([]);
      stickToBottomRef.current = true;
      shouldAutoScrollNextRef.current = true;
      scrollBehaviorNextRef.current = "smooth";
      await refresh();
    } finally {
      setSending(false);
    }
  };

  const startEdit = (m: ChatMessagePayload) => {
    setOpenMenuFor(null);
    setEditingId(m.id);
    setEditingText(m.content || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const result = await editGroupMessage({
      messageId: editingId,
      content: editingText,
    });
    if (!result.ok) {
      if (result.error === "empty") toast(chat.errorEmpty);
      else if (result.error === "too_long") toast(chat.errorSend);
      else toast(chat.errorSend);
      return;
    }
    cancelEdit();
    await refresh();
  };

  const doDelete = async (messageId: string) => {
    setOpenMenuFor(null);
    const ok = window.confirm(dict.common.delete);
    if (!ok) return;
    const result = await deleteGroupMessage({ messageId });
    if (!result.ok) {
      toast(chat.errorSend);
      return;
    }
    if (editingId === messageId) cancelEdit();
    await refresh();
  };

  const onToggleReaction = async (messageId: string, emoji: string) => {
    const result = await toggleMessageReaction(messageId, emoji);
    if (!result.ok) {
      toast(chat.errorReaction);
      return;
    }
    await refresh();
  };

  const startLongPress = (messageId: string) => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setReactionBarFor(messageId);
      longPressTimerRef.current = null;
    }, 350);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };


  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full flex-1 min-h-0 flex-col gap-2">
      <div
        ref={listRef}
        onScroll={onScrollList}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-3"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">{chat.empty}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const isEditing = editingId === m.id;
              const showReactionBar = reactionBarFor === m.id;
              const existingReactions = m.reactions.filter((r) => r.count > 0);
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    data-reaction-root="true"
                    className={`group relative max-w-[min(85%,28rem)] rounded-2xl px-4 py-3 pr-10 shadow-sm ${
                      mine
                        ? "rounded-br-md bg-kitaSkyLight text-gray-900"
                        : "rounded-bl-md bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                      <span className="text-sm font-semibold">
                        {mine ? chat.you : m.senderName}
                      </span>
                      <div className="flex items-center gap-2">
                        <time
                          className="text-[11px] text-gray-500"
                          dateTime={m.createdAt}
                        >
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(m.createdAt))}
                        </time>
                        {m.editedAt ? (
                          <span className="text-[11px] text-gray-400">
                            {chat.edited}
                          </span>
                        ) : null}
                        {mine ? (
                          <div
                            className="relative shrink-0"
                            data-chat-message-menu="true"
                          >
                            <button
                              type="button"
                              className="rounded-md p-0.5 text-gray-700/70 hover:bg-white/50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                              aria-expanded={openMenuFor === m.id}
                              aria-haspopup="menu"
                              aria-label={dict.common.actions}
                              onClick={() =>
                                setOpenMenuFor((prev) =>
                                  prev === m.id ? null : m.id
                                )
                              }
                            >
                              <Image
                                src="/more.png"
                                alt=""
                                width={18}
                                height={18}
                              />
                            </button>
                            {openMenuFor === m.id ? (
                              <div
                                className="absolute right-0 top-full z-40 mt-1.5 min-w-[10rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                                  onClick={() => startEdit(m)}
                                >
                                  {chat.edit}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="w-full px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-gray-50"
                                  onClick={() => doDelete(m.id)}
                                >
                                  {dict.common.delete}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {dict.common.close}
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
                          >
                            {dict.common.save}
                          </button>
                        </div>
                      </div>
                    ) : m.content ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                        {m.content}
                      </p>
                    ) : null}
                    {m.attachments.length > 0 ? (
                      <div
                        className={`mt-2 flex flex-col gap-2 ${m.content ? "" : "mt-1"}`}
                      >
                        {m.attachments.map((a) =>
                          isChatImageMime(a.mimeType) ? (
                            <a
                              key={a.id}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-md"
                            >
                              <Image
                                src={a.url}
                                alt={chat.attachmentLabel}
                                width={320}
                                height={240}
                                className="max-h-56 w-auto max-w-full object-contain"
                                unoptimized
                              />
                            </a>
                          ) : (
                            <a
                              key={a.id}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-gray-50"
                            >
                              <span className="truncate">{a.fileName}</span>
                              <span
                                className="shrink-0 text-gray-400"
                                title={chat.download}
                                aria-label={chat.download}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                >
                                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v7.69L6.53 7.72a.75.75 0 1 0-1.06 1.06l4 4a.75.75 0 0 0 1.06 0l4-4a.75.75 0 1 0-1.06-1.06l-2.72 2.72V2.75Z" />
                                  <path d="M3.5 13.25a.75.75 0 0 1 .75.75v1.25c0 .69.56 1.25 1.25 1.25h9c.69 0 1.25-.56 1.25-1.25V14a.75.75 0 0 1 1.5 0v1.25A2.75 2.75 0 0 1 14.5 18h-9A2.75 2.75 0 0 1 2.75 15.25V14a.75.75 0 0 1 .75-.75Z" />
                                </svg>
                              </span>
                            </a>
                          )
                        )}
                      </div>
                    ) : null}
                    {existingReactions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-black/5 pt-2">
                        {existingReactions.map((r) => (
                          <button
                            key={`${m.id}-${r.emoji}`}
                            type="button"
                            title={r.emoji}
                            onClick={() => onToggleReaction(m.id, r.emoji)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                              r.reactedByMe
                                ? "border-kitaPurple bg-white"
                                : "border-gray-200 bg-white/60 hover:bg-white"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-gray-600">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {/* Default minimal reactions affordance (Viber-style) */}
                    <div
                      className="absolute bottom-2 right-2"
                      onMouseEnter={() => setReactionBarFor(m.id)}
                      onMouseLeave={() =>
                        setReactionBarFor((prev) =>
                          prev === m.id ? null : prev
                        )
                      }
                      onPointerDown={(e) => {
                        if (e.pointerType === "touch") startLongPress(m.id);
                      }}
                      onPointerUp={() => cancelLongPress()}
                      onPointerCancel={() => cancelLongPress()}
                    >
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-gray-400 shadow-sm ring-1 ring-black/5 opacity-80 transition hover:bg-white hover:text-gray-600 group-hover:opacity-100"
                        aria-label="Reactions"
                        title="Reactions"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Click opens picker (neutral entry point).
                          setReactionBarFor((prev) => (prev === m.id ? null : m.id));
                        }}
                        onMouseEnter={() => setReactionBarFor(m.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.75-8.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5.5 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM6.97 11.72a.75.75 0 0 1 1.06.11A2.5 2.5 0 0 0 10 13c.78 0 1.48-.36 1.97-1.06a.75.75 0 1 1 1.22.85A4 4 0 0 1 10 14.5a4 4 0 0 1-3.14-1.71.75.75 0 0 1 .11-1.07Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Floating reaction bar (hover/tap/long-press) */}
                      <div
                        className={`pointer-events-none absolute bottom-full right-0 z-40 mb-2 flex origin-bottom-right items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-lg transition ${
                          showReactionBar
                            ? "scale-100 opacity-100"
                            : "scale-95 opacity-0"
                        }`}
                      >
                        <div className="pointer-events-auto flex items-center gap-1">
                          {CHAT_REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={`${m.id}-${emoji}`}
                              type="button"
                              title={emoji}
                              onClick={() => onToggleReaction(m.id, emoji)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100"
                            >
                              <span className="text-base leading-none">
                                {emoji}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray-200 bg-white pt-3">
        {pending.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-xs">
            {pending.map((p, idx) => (
              <li
                key={`${p.url}-${idx}`}
                className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1"
              >
                <span className="max-w-[12rem] truncate">{p.fileName}</span>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-800"
                  onClick={() => removePending(idx)}
                  aria-label={dict.common.close}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <CldUploadWidget
            uploadPreset="kita_app"
            options={{
              sources: ["local"],
              multiple: false,
              maxFiles: 1,
              resourceType: "auto",
              clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "pdf"],
            }}
            onError={(err) => {
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[chat][upload][cloudinary error]", err);
              }
              toast(chat.errorSend);
            }}
            onSuccess={(result) => {
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[chat][upload][cloudinary success raw result]", result);
              }
              const info = result?.info;
              if (info && typeof info === "object") {
                addPendingFromUpload(
                  info as {
                    secure_url?: string;
                    bytes?: number;
                    original_filename?: string;
                    resource_type?: string;
                    format?: string;
                    mime_type?: string;
                  }
                );
              }
            }}
          >
            {({ open }) => (
              <div className="flex flex-1 flex-col gap-1">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={chat.placeholder}
                    rows={2}
                    disabled={sending}
                    className="min-h-[2.75rem] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 pr-28 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
                  />

                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                    {/* Emoji */}
                    <div className="relative" ref={emojiRootRef}>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => setEmojiOpen((v) => !v)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
                        aria-label="Emoji"
                        title="Emoji"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.75-8.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5.5 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM6.97 11.72a.75.75 0 0 1 1.06.11A2.5 2.5 0 0 0 10 13c.78 0 1.48-.36 1.97-1.06a.75.75 0 1 1 1.22.85A4 4 0 0 1 10 14.5a4 4 0 0 1-3.14-1.71.75.75 0 0 1 .11-1.07Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {emojiOpen ? (
                        <div className="absolute bottom-full right-0 z-50 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                          <div className="mb-2 flex flex-wrap gap-1">
                            {EMOJI_SECTIONS.map((s) => (
                              <a
                                key={s.id}
                                href={`#emoji-${s.id}`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50"
                                aria-label={s.id}
                                title={s.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  const el = document.getElementById(
                                    `emoji-${s.id}`
                                  );
                                  el?.scrollIntoView({ block: "start" });
                                }}
                              >
                                {s.label}
                              </a>
                            ))}
                          </div>
                          <div className="max-h-56 overflow-y-auto pr-1">
                            {EMOJI_SECTIONS.map((section) => (
                              <div key={section.id} className="mb-2">
                                <div
                                  id={`emoji-${section.id}`}
                                  className="mb-1 text-[11px] font-medium text-gray-500"
                                >
                                  {section.id}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {section.emojis.map((emoji) => (
                                    <button
                                      key={`${section.id}-${emoji}`}
                                      type="button"
                                      disabled={sending}
                                      onClick={() => {
                                        setText((prev) => `${prev}${emoji}`);
                                        inputRef.current?.focus();
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-50"
                                      aria-label={emoji}
                                      title={emoji}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Attach */}
                    <button
                      type="button"
                      disabled={
                        pending.length >= CHAT_MAX_ATTACHMENTS_PER_MESSAGE ||
                        sending
                      }
                      onClick={() => open()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
                      aria-label={chat.attach}
                      title={chat.attach}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path d="M12.5 5.25a3.25 3.25 0 0 1 3.25 3.25v5.25a5.75 5.75 0 1 1-11.5 0V6.5a4.25 4.25 0 1 1 8.5 0v7.25a2.75 2.75 0 1 1-5.5 0V7.5a.75.75 0 0 1 1.5 0v6.25a1.25 1.25 0 1 0 2.5 0V6.5a2.75 2.75 0 1 0-5.5 0v7.25a4.25 4.25 0 1 0 8.5 0V8.5a1.75 1.75 0 0 0-3.5 0v5.25a.75.75 0 0 1-1.5 0V8.5a3.25 3.25 0 0 1 3.25-3.25Z" />
                      </svg>
                    </button>

                    {/* Send */}
                    <button
                      type="button"
                      disabled={
                        sending || (text.trim().length === 0 && pending.length === 0)
                      }
                      onClick={submit}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600 disabled:bg-blue-500 disabled:opacity-40"
                      aria-label={chat.send}
                      title={chat.send}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 translate-x-[0.5px]"
                        aria-hidden="true"
                      >
                        <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CldUploadWidget>

        </div>
      </div>
    </div>
  );
}
