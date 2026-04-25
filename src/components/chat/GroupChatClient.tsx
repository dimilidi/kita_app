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
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const [messages, setMessages] =
    useState<ChatMessagePayload[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessagePayload[] };
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
    const id = window.setInterval(refresh, CHAT_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useLayoutEffect(() => {
    if (stickToBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const onScrollList = () => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 120;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2">
      <div
        ref={listRef}
        onScroll={onScrollList}
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">{chat.empty}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[min(85%,28rem)] rounded-2xl px-4 py-3 shadow-sm ${
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
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-black/5 pt-2">
                      {CHAT_REACTION_EMOJIS.map((emoji) => {
                        const row = m.reactions.find((r) => r.emoji === emoji);
                        const count = row?.count ?? 0;
                        const active = row?.reactedByMe ?? false;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            title={emoji}
                            onClick={() => onToggleReaction(m.id, emoji)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                              active
                                ? "border-kitaPurple bg-white"
                                : "border-gray-200 bg-white/60 hover:bg-white"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 ? (
                              <span className="text-gray-600">{count}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray-200 pt-3">
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
              <button
                type="button"
                disabled={
                  pending.length >= CHAT_MAX_ATTACHMENTS_PER_MESSAGE || sending
                }
                className="flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => open()}
              >
                {chat.attach}
              </button>
            )}
          </CldUploadWidget>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={chat.placeholder}
            rows={2}
            disabled={sending}
            className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
          />

          <button
            type="button"
            disabled={sending}
            onClick={submit}
            className="h-10 shrink-0 rounded-lg bg-blue-500 px-4 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {chat.send}
          </button>
        </div>
      </div>
    </div>
  );
}
