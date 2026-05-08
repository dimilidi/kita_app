"use client";

import { sendParentMessageToKindergartenEmail } from "@/lib/actions";
import { CalendarX, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

export type ParentAttendanceUiStatus =
  | "absent"
  | "checked_in"
  | "checked_out"
  | "no_record";

type Props = {
  lang: "en" | "de";
  student: { id: string; name: string; surname: string };
  attendanceStatus: ParentAttendanceUiStatus;
  pickupTime: string | null;
  playAreaLabel: string | null;
  lunchGroupLabel: string | null;
  strings: {
    titleToday: string;
    attendance: string;
    currentPlayArea: string;
    currentLunchGroup: string;
    statusAbsent: string;
    statusCheckedIn: string;
    statusCheckedOut: string;
    statusNoAttendanceToday: string;
    reportAbsence: string;
    sendMessage: string;
    absenceModalTitle: string;
    absenceOptionalNoteLabel: string;
    absenceSend: string;
    absenceSending: string;
    absenceReportedSuccess: string;
    messageModalTitle: string;
    messageSubjectLabel: string;
    messageLabel: string;
    send: string;
    sending: string;
    sentSuccess: string;
    saveFailed: string;
  };
};

export default function ParentChildStatusCardClient({
  lang,
  student,
  attendanceStatus,
  pickupTime,
  playAreaLabel,
  lunchGroupLabel,
  strings,
}: Props) {
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [absenceNote, setAbsenceNote] = useState("");
  const [absenceSending, setAbsenceSending] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const statusLabel = useMemo(() => {
    switch (attendanceStatus) {
      case "checked_out":
        return strings.statusCheckedOut;
      case "checked_in":
        return strings.statusCheckedIn;
      case "no_record":
        return strings.statusNoAttendanceToday;
      default:
        return strings.statusAbsent;
    }
  }, [attendanceStatus, strings]);

  /** checked_in = green, absent = red, checked_out / no_record = gray */
  const dotClass =
    attendanceStatus === "absent"
      ? "bg-rose-500"
      : attendanceStatus === "checked_in"
        ? "bg-emerald-500"
        : "bg-gray-400";

  const todayStr = () => new Date().toLocaleDateString("en-CA");

  const onSendAbsenceEmail = async () => {
    if (absenceSending) return;
    setAbsenceSending(true);
    try {
      const note = absenceNote.trim();
      const lines = [
        `The child will be absent today.`,
        `Date: ${todayStr()}`,
      ];
      if (note) {
        lines.push("", `Note: ${note}`);
      }
      const res = await sendParentMessageToKindergartenEmail({
        studentId: student.id,
        subject: `Absence report: ${student.name} ${student.surname} (${todayStr()})`,
        message: lines.join("\n"),
      });
      if (!res.ok) {
        toast(strings.saveFailed);
        return;
      }
      toast(strings.absenceReportedSuccess);
      setAbsenceOpen(false);
      setAbsenceNote("");
    } finally {
      setAbsenceSending(false);
    }
  };

  const onSendMessage = async () => {
    if (sending) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await sendParentMessageToKindergartenEmail({
        studentId: student.id,
        subject: subject.trim() ? subject.trim() : undefined,
        message: trimmed,
      });
      if (!res.ok) {
        toast(strings.saveFailed);
        return;
      }
      toast(strings.sentSuccess);
      setMessageOpen(false);
      setSubject("");
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const closeLabel = lang === "de" ? "Schließen" : "Close";

  const iconBtnBase =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kitaSky focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="rounded-md bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-500">{strings.titleToday}</div>
          <h2 className="text-lg font-semibold text-gray-900 break-words">
            {student.name} {student.surname}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className={`${iconBtnBase} bg-kitaYellow/90 border-kitaYellow hover:bg-kitaYellow`}
            onClick={() => setAbsenceOpen(true)}
            disabled={absenceSending}
            title={strings.reportAbsence}
            aria-label={strings.reportAbsence}
          >
            <CalendarX className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={iconBtnBase}
            title={strings.sendMessage}
            aria-label={strings.sendMessage}
            onClick={() => setMessageOpen(true)}
            disabled={sending}
          >
            <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md bg-slate-50 border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500">{strings.attendance}</div>
          <div className="mt-1 grid grid-cols-[12px_1fr] items-start gap-x-2.5 gap-y-0.5">
            <span className={`mt-[3px] h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 leading-snug">{statusLabel}</div>
              {attendanceStatus === "checked_out" && pickupTime ? (
                <div className="text-[11px] text-gray-600 tabular-nums">{pickupTime}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-md bg-slate-50 border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500">{strings.currentPlayArea}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 break-words">
            {playAreaLabel ?? "—"}
          </div>
        </div>

        <div className="rounded-md bg-slate-50 border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500">{strings.currentLunchGroup}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 break-words">
            {lunchGroupLabel ?? "—"}
          </div>
        </div>
      </div>

      {absenceOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-absence-modal-title"
          onClick={() => !absenceSending && setAbsenceOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="parent-absence-modal-title" className="text-sm font-semibold text-gray-900 mb-3">
              {strings.absenceModalTitle}
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              <span className="font-medium text-gray-800">
                {student.name} {student.surname}
              </span>
              {" — "}
              <span className="tabular-nums">{todayStr()}</span>
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {strings.absenceOptionalNoteLabel}
            </label>
            <textarea
              className="w-full min-h-[6rem] border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={absenceNote}
              onChange={(e) => setAbsenceNote(e.target.value)}
              disabled={absenceSending}
              placeholder="(optional)"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                disabled={absenceSending}
                onClick={() => setAbsenceOpen(false)}
              >
                {closeLabel}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90 disabled:opacity-60"
                disabled={absenceSending}
                onClick={() => void onSendAbsenceEmail()}
              >
                {absenceSending ? strings.absenceSending : strings.absenceSend}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {messageOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-message-modal-title"
          onClick={() => !sending && setMessageOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="parent-message-modal-title" className="text-sm font-semibold text-gray-900 mb-3">
              {strings.messageModalTitle}
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              <span className="font-medium text-gray-800">
                {student.name} {student.surname}
              </span>
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {strings.messageSubjectLabel}
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              placeholder="(optional)"
            />
            <label className="block text-xs font-medium text-gray-600 mb-1.5 mt-3">
              {strings.messageLabel}
            </label>
            <textarea
              className="w-full min-h-[8rem] border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                disabled={sending}
                onClick={() => setMessageOpen(false)}
              >
                {closeLabel}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90 disabled:opacity-60"
                disabled={sending || message.trim().length === 0}
                onClick={() => void onSendMessage()}
              >
                {sending ? strings.sending : strings.send}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
