"use client";

import {
  getAttendanceRowsForPdfExport,
  markAttendancePickedUp,
  saveAttendanceDayDetail,
  saveDailyAttendance,
  sendParentMessageToKindergartenEmail,
} from "@/lib/actions";
import Pagination from "@/components/Pagination";
import WorkingDayDatePicker from "@/components/attendance/WorkingDayDatePicker";
import SearchInput from "@/components/search/SearchInput";
import FilterPanel from "@/components/filter/FilterPanel";
import FilterDropdown from "@/components/filter/FilterDropdown";
import ResetFiltersButton from "@/components/filter/ResetFiltersButton";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition, useState } from "react";
import { toast } from "react-toastify";
import type { AttendanceRow } from "./types";
import { Mail, UserX } from "lucide-react";

export type { AttendanceRow };

export default function AttendancePageClient({
  viewerRole,
  dateStr,
  classId,
  rows,
  count,
  page,
  summary,
  classes,
  canEdit,
  canRevertAbsent,
}: {
  viewerRole: string | null;
  dateStr: string;
  classId: string;
  rows: AttendanceRow[];
  count: number;
  page: number;
  summary: {
    total: number;
    absentCount: number;
    checkedInCount: number;
    checkedOutCount: number;
  };
  classes: { id: number; name: string }[];
  canEdit: boolean;
  canRevertAbsent: boolean;
}) {
  const dict = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [localRows, setLocalRows] = useState<AttendanceRow[]>(rows);
  const [notesModalStudentId, setNotesModalStudentId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [parentAbsenceStudentId, setParentAbsenceStudentId] = useState<string | null>(null);
  const [parentAbsenceNote, setParentAbsenceNote] = useState("");
  const [parentAbsenceSending, setParentAbsenceSending] = useState(false);
  const [parentMessageStudentId, setParentMessageStudentId] = useState<string | null>(null);
  const [parentSubject, setParentSubject] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [parentMessageSending, setParentMessageSending] = useState(false);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  useEffect(() => {
    if (!notesModalStudentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotesModalStudentId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notesModalStudentId]);

  useEffect(() => {
    if (!parentAbsenceStudentId && !parentMessageStudentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (parentAbsenceStudentId) setParentAbsenceStudentId(null);
      if (parentMessageStudentId) setParentMessageStudentId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [parentAbsenceStudentId, parentMessageStudentId]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = actionsRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [actionsOpen]);

  const buildQuery = (next: { date?: string; classId?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next.date ?? dateStr);
    params.set("classId", next.classId ?? classId);
    // When scope changes, reset paging.
    params.delete("page");
    return params.toString();
  };

  const { total, absentCount, checkedInCount, checkedOutCount } = summary;

  // Status is derived from existing DB fields (no new persisted status).
  type DerivedStatus = "absent" | "checked_in" | "checked_out";
  const deriveStatus = (r: AttendanceRow): DerivedStatus => {
    if (!r.present) return "absent";
    if (r.actualPickupTime) return "checked_out";
    return "checked_in";
  };

  // Keep summary cards responsive to optimistic local changes.
  // Summary values are for all filtered students (not just the current page),
  // so we apply a delta from the current page rows.
  const countStatuses = (rs: AttendanceRow[]) => {
    let absent = 0;
    let checkedOut = 0;
    let checkedIn = 0;
    for (const r of rs) {
      const s = deriveStatus(r);
      if (s === "absent") absent++;
      else if (s === "checked_out") checkedOut++;
      else checkedIn++;
    }
    return { absent, checkedIn, checkedOut };
  };

  const basePage = countStatuses(rows);
  const localPage = countStatuses(localRows);

  const absentCountDisplay = Math.max(
    0,
    Math.min(total, absentCount + (localPage.absent - basePage.absent))
  );
  const checkedInCountDisplay = Math.max(
    0,
    Math.min(total, checkedInCount + (localPage.checkedIn - basePage.checkedIn))
  );
  const checkedOutCountDisplay = Math.max(
    0,
    Math.min(total, checkedOutCount + (localPage.checkedOut - basePage.checkedOut))
  );

  const onToggle = async (studentId: string, nextPresent: boolean) => {
    if (!canEdit) return;
    // optimistic update
    setLocalRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, present: nextPresent } : r))
    );
    const res = await saveDailyAttendance({
      studentId,
      dateStr,
      present: nextPresent,
    });
    if (!res.success) {
      if (res.error === "noLesson") {
        toast(dict.attendancePage.noLesson);
      } else {
        toast(dict.attendancePage.saveFailed);
      }
      // revert on failure
      setLocalRows(rows);
      return;
    }
    startTransition(() => router.refresh());
  };

  const onSaveNotesModal = async () => {
    if (!notesModalStudentId || isSavingNotes) return;
    setIsSavingNotes(true);
    try {
      const noteText = notesDraft.trim();
      const res = await saveAttendanceDayDetail({
        studentId: notesModalStudentId,
        dateStr,
        note: noteText ? noteText : null,
      });
      if (!res.success) {
        toast(dict.attendancePage.detailSaveFailed);
        return;
      }
      setLocalRows((prev) =>
        prev.map((r) =>
          r.id === notesModalStudentId ? { ...r, note: noteText ? noteText : null } : r
        )
      );
      setNotesModalStudentId(null);
      startTransition(() => router.refresh());
    } finally {
      setIsSavingNotes(false);
    }
  };

  const nowHHmm = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const todayStr = () => new Date().toLocaleDateString("en-CA");

  const onSendParentAbsenceEmail = async (studentId: string, studentName: string) => {
    if (parentAbsenceSending) return;
    setParentAbsenceSending(true);
    try {
      const note = parentAbsenceNote.trim();
      const lines = [`The child will be absent today.`, `Date: ${todayStr()}`];
      if (note) lines.push("", `Note: ${note}`);
      const res = await sendParentMessageToKindergartenEmail({
        studentId,
        subject: `Absence report: ${studentName} (${todayStr()})`,
        message: lines.join("\n"),
      });
      if (!res.ok) {
        toast(dict.attendancePage.detailSaveFailed);
        return;
      }
      toast(dict.dashboard.absenceReportedSuccess ?? "Absence reported successfully");
      setParentAbsenceStudentId(null);
      setParentAbsenceNote("");
      if (pathname) {
        // no-op; parent action sends email only
      }
    } finally {
      setParentAbsenceSending(false);
    }
  };

  const onSendParentMessageEmail = async (studentId: string) => {
    if (parentMessageSending) return;
    const trimmed = parentMessage.trim();
    if (!trimmed) return;
    setParentMessageSending(true);
    try {
      const res = await sendParentMessageToKindergartenEmail({
        studentId,
        subject: parentSubject.trim() ? parentSubject.trim() : undefined,
        message: trimmed,
      });
      if (!res.ok) {
        toast(dict.attendancePage.detailSaveFailed);
        return;
      }
      toast(dict.dashboard.messageSentSuccess ?? "Message sent.");
      setParentMessageStudentId(null);
      setParentSubject("");
      setParentMessage("");
    } finally {
      setParentMessageSending(false);
    }
  };

  const onMarkPickedUp = async (studentId: string) => {
    if (!canEdit) return;
    const pickedUpAt = nowHHmm();
    setLocalRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, actualPickupTime: pickedUpAt } : r))
    );
    const res = await markAttendancePickedUp({ studentId, dateStr, pickedUpAt });
    if (!res.success) {
      toast(dict.attendancePage.detailSaveFailed);
      setLocalRows(rows);
      return;
    }
    startTransition(() => router.refresh());
  };

  const onDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const pdfRows = await getAttendanceRowsForPdfExport(dateStr, classId);
      // Client-side PDF export (multi-page) so printing after download works reliably.
      // Lazy-load to avoid Next/SSR import quirks.
      const [jspdfMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const jsPDFConstructor = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default;
      if (typeof jsPDFConstructor !== "function") {
        throw new Error("Could not load jsPDF constructor.");
      }

      const selectedClassLabel =
        classId === "all"
          ? dict.attendancePage.allGroups
          : classes.find((c) => String(c.id) === classId)?.name ??
            dict.attendancePage.allGroups;

      const safeLabel = String(selectedClassLabel)
        .trim()
        .replace(/[\/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 40);

      const doc = new jsPDFConstructor({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const left = 40;
      const right = 40;
      let y = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightX = pageWidth - right;

      // Title at the very top
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(dict.dashboard.attendance, left, y);
      y += 20;

      // App branding under the title (logo + app name)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      try {
        const resp = await fetch("/logo.jpg");
        if (resp.ok) {
          const blob = await resp.blob();
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read logo image"));
            reader.readAsDataURL(blob);
          });

          // small logo + name line
          const logoW = 18;
          const logoH = 18;
          const brandY = y - 12;
          doc.addImage(dataUrl, "JPEG", left, brandY, logoW, logoH);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text("KitaKarlstraße", left + logoW + 8, y);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
        }
      } catch {
        // If logo can't be loaded, continue without it.
      }

      y += 18;
      doc.text(`${dict.attendancePage.date}: ${dateStr}`, rightX, y, { align: "right" });
      y += 14;
      doc.text(
        `${dict.attendancePage.filterGroup}: ${selectedClassLabel}`,
        rightX,
        y,
        { align: "right" }
      );
      y += 18;

      // Summary counts above the table
      doc.setFont("helvetica", "bold");
      doc.text(`${dict.attendancePage.totalChildren}: ${total}`, left, y);
      y += 12;
      doc.text(`${dict.attendancePage.statusAbsent ?? "Absent"}: ${absentCountDisplay}`, left, y);
      y += 12;
      doc.text(`${dict.attendancePage.statusCheckedIn ?? "Checked-in"}: ${checkedInCountDisplay}`, left, y);
      y += 12;
      doc.text(`${dict.attendancePage.statusCheckedOut ?? "Checked-out"}: ${checkedOutCountDisplay}`, left, y);
      y += 12;
      const startY = y + 8;

      const head = [
        [
          dict.attendancePage.childName,
          dict.attendancePage.group,
          dict.attendancePage.status,
          dict.attendancePage.notes,
        ],
      ];

      const body = pdfRows.map((row) => [
        `${row.name} ${row.surname}`.trim(),
        row.className ?? "—",
        !row.present
          ? "absent"
          : row.actualPickupTime
            ? `checked_out::${row.actualPickupTime}`
            : "checked_in",
        row.note?.trim() ? row.note : "",
      ]);

      // `jspdf-autotable` is commonly used as: autoTable(doc, options)
      // This avoids reliance on whether `doc.autoTable` was attached correctly.
      const autoTableMod = await import("jspdf-autotable");
      const autoTableFn = (autoTableMod as any).default ?? autoTableMod;
      if (typeof autoTableFn !== "function") {
        throw new Error("autoTable is not available. jspdf-autotable did not load correctly.");
      }

      autoTableFn(doc, {
        head,
        body,
        startY,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 4,
          // Slightly thicker grid lines for readability in printouts.
          lineWidth: 0.25,
        },
        headStyles: { fillColor: [248, 250, 252], textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 160 },
          1: { cellWidth: 72, halign: "right" },
          2: { cellWidth: 140 },
          3: { cellWidth: 140 },
        },
        margin: { left, right },
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          if (!data.column || data.column.index !== 2) return; // status column

          const raw = data.cell?.raw;
          const text =
            typeof raw === "string"
              ? raw
              : Array.isArray(raw)
                ? raw.join(" ")
                : String(raw ?? "");

          const [kindRaw, timeRaw] = text.split("::");
          const kind =
            kindRaw === "checked_in" || kindRaw === "checked_out" || kindRaw === "absent"
              ? (kindRaw as "checked_in" | "checked_out" | "absent")
              : "absent";
          const time =
            kind === "checked_out" && typeof timeRaw === "string" && timeRaw.trim()
              ? timeRaw.trim()
              : null;

          const label =
            kind === "checked_in"
              ? dict.attendancePage.statusCheckedIn ?? "Checked-in"
              : kind === "checked_out"
                ? dict.attendancePage.statusCheckedOut ?? "Checked-out"
                : dict.attendancePage.statusAbsent ?? "Absent";

          data.cell.text = time ? [label, time] : [label];
          data.cell.styles.valign = "middle";
          data.cell.styles.halign = "left";
          // Make room for the colored dot + consistent left alignment.
          data.cell.styles.cellPadding = { top: 4, right: 4, bottom: 4, left: 16 };
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          if (!data.column || data.column.index !== 2) return; // status column

          const raw = data.cell?.raw;
          const text =
            typeof raw === "string"
              ? raw
              : Array.isArray(raw)
                ? raw.join(" ")
                : String(raw ?? "");
          const kindRaw = text.split("::")[0];
          const kind =
            kindRaw === "checked_in" || kindRaw === "checked_out" || kindRaw === "absent"
              ? (kindRaw as "checked_in" | "checked_out" | "absent")
              : "absent";

          const { x, y } = data.cell;
          // Fixed-size indicator for consistent rows (independent of content/row height).
          const r = 3.2;
          const fontSize = Number(data.cell.styles?.fontSize) || 9;
          // Align dot with first-line baseline consistently.
          const cx = x + 9;
          const cy = y + 4 + fontSize * 0.8;

          const rgb =
            kind === "checked_in"
              ? [34, 197, 94] // green
              : kind === "checked_out"
                ? [14, 165, 233] // blue (sky)
                : [244, 63, 94]; // red (rose)

          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          doc.circle(cx, cy, r, "F");
        },
        didDrawPage: (data: any) => {
          // Footer page number (helps when printing the downloaded PDF).
          const pageCount = doc.getNumberOfPages();
          const pageNumber = data.pageNumber ?? 1;
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.text(
            `Page ${pageNumber}/${pageCount}`,
            40,
            doc.internal.pageSize.getHeight() - 20
          );
        },
      });

      doc.save(`attendance_${safeLabel}_${dateStr}.pdf`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Attendance PDF export failed:", e);
      const errorMessage =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      toast(
        `${
          dict.forms?.somethingWentWrong ?? "Something went wrong!"
        }${errorMessage ? `: ${errorMessage}` : ""}`
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {dict.dashboard.attendance}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {dict.attendancePage.subtitle}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />

          <div className="flex flex-wrap gap-3 items-center justify-end self-end">
          <label className="flex flex-col gap-1 text-sm">
            <WorkingDayDatePicker
              value={dateStr}
              disabled={isPending}
              ariaLabel={dict.attendancePage.date}
              onChange={(next) =>
                startTransition(() =>
                  router.replace(`${pathname}?${buildQuery({ date: next })}`)
                )
              }
            />
          </label>

          <FilterPanel title={dict.common.filters}>
            <FilterDropdown
              label={dict.attendancePage.filterGroup}
              paramKey="classId"
              allowClear={false}
              options={[
                { label: dict.attendancePage.allGroups, value: "all" },
                ...classes.map((c) => ({ label: String(c.name), value: String(c.id) })),
              ]}
            />
            <FilterDropdown
              label={dict.attendancePage.status}
              paramKey="status"
              options={[
                { label: dict.attendancePage.statusAbsent ?? "Absent", value: "absent" },
                { label: dict.attendancePage.statusCheckedIn ?? "Checked-in", value: "checked_in" },
                { label: dict.attendancePage.statusCheckedOut ?? "Checked-out", value: "checked_out" },
              ]}
            />
            <FilterDropdown
              label={dict.forms.sex}
              paramKey="sex"
              options={[
                { label: dict.forms.male, value: "MALE" },
                { label: dict.forms.female, value: "FEMALE" },
              ]}
            />
          </FilterPanel>
          <ResetFiltersButton label={dict.common.resetFilters ?? "Reset filters"} />
          {canEdit && (
            <div className="relative flex items-center" ref={actionsRef}>
              <button
                type="button"
                className="h-[36px] w-[36px] rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => setActionsOpen((v) => !v)}
                aria-label={dict.common.actions}
                title={dict.common.actions}
                disabled={isPending || isDownloadingPdf}
              >
                {/* kebab/menu icon (3 dots) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-gray-700"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="18.5" r="1.6" fill="currentColor" />
                </svg>
              </button>

              {actionsOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setActionsOpen(false);
                      onPrint();
                    }}
                  >
                    {/* printer icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <path d="M6 9V3h12v6" />
                      <rect x="6" y="14" width="12" height="7" rx="1" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    </svg>
                    <span>{dict.attendancePage.printPdf}</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setActionsOpen(false);
                      onDownloadPdf();
                    }}
                    disabled={isDownloadingPdf}
                  >
                    {/* download icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                    <span>{dict.attendancePage.downloadPdf}</span>
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.totalChildren}</p>
          <p className="text-2xl font-semibold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.statusAbsent ?? "Absent"}</p>
          <p className="text-2xl font-semibold text-rose-700">{absentCountDisplay}</p>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.statusCheckedIn ?? "Checked-in"}</p>
          <p className="text-2xl font-semibold text-emerald-700">{checkedInCountDisplay}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.statusCheckedOut ?? "Checked-out"}</p>
          <p className="text-2xl font-semibold text-gray-800">{checkedOutCountDisplay}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print:overflow-visible">
        <div className="overflow-x-auto overscroll-x-contain print:overflow-visible [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-left">
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[9rem] align-top">
                  {dict.attendancePage.childName}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[5rem] align-top">
                  {dict.attendancePage.group}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[8.5rem] align-top">
                  {dict.attendancePage.status}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[10rem] align-top">
                  {dict.common.actions ?? "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {localRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    {dict.attendancePage.noResultsFound ?? dict.attendancePage.noStudents}
                  </td>
                </tr>
              ) : (
                localRows.map((row) => {
                  const isParentView = viewerRole === "parent";
                  const disabled = !canEdit || !row.lessonId || isPending;
                  const status = deriveStatus(row);
                  const statusLabel =
                    status === "absent"
                      ? (dict.attendancePage.statusAbsent ?? "Absent")
                      : status === "checked_in"
                        ? (dict.attendancePage.statusCheckedIn ?? "Checked-in")
                        : (dict.attendancePage.statusCheckedOut ?? "Checked-out");
                  const dotClass =
                    status === "absent"
                      ? "bg-rose-500"
                      : status === "checked_in"
                        ? "bg-emerald-500"
                        : "bg-sky-500";

                  const canCheckIn = !disabled && status === "absent";
                  const canCheckOut = !disabled && status === "checked_in";
                  const canSetAbsent = canRevertAbsent && !disabled && status !== "absent";
                  const canNotes = canEdit && !!row.lessonId;
                  const canParentReportAbsence = isParentView && status === "absent";
                  return (
                    <tr
                      key={`${row.id}-${dateStr}`}
                      className="border-b border-gray-100 even:bg-slate-50/60 hover:bg-kitaPurpleLight/40"
                    >
                      <td className="p-3 sm:p-4 font-medium text-gray-900">
                        {row.name} {row.surname}
                      </td>
                      <td className="p-3 sm:p-4 text-gray-600">
                        {row.className}
                      </td>
                      <td className="p-3 sm:p-4 align-top">
                        <div className="grid grid-cols-[12px_1fr] items-start gap-x-2.5 gap-y-0.5">
                          <span
                            className={`mt-[3px] h-2.5 w-2.5 rounded-full ${dotClass}`}
                            aria-hidden
                          />
                          <span className="text-xs font-semibold text-gray-900 leading-snug">
                            {statusLabel}
                          </span>
                          {status === "checked_out" && row.actualPickupTime ? (
                            <>
                              <span aria-hidden />
                              <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-gray-600 leading-snug">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-3.5 h-3.5 text-gray-500"
                                  aria-hidden
                                >
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M12 7v5l3 2" />
                                </svg>
                                <span>{row.actualPickupTime}</span>
                              </div>
                            </>
                          ) : null}
                          {!row.lessonId ? (
                            <>
                              <span aria-hidden />
                              <p className="text-xs text-amber-600 leading-snug">
                                {dict.attendancePage.noLessonShort}
                              </p>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          {isParentView ? (
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaYellow hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                              disabled={!canParentReportAbsence || parentAbsenceSending || parentMessageSending}
                              title={dict.dashboard.reportAbsence ?? "Report absence"}
                              aria-label={dict.dashboard.reportAbsence ?? "Report absence"}
                              onClick={() => {
                                if (!canParentReportAbsence) return;
                                setParentAbsenceStudentId(row.id);
                                setParentAbsenceNote("");
                              }}
                            >
                              <UserX className="w-4 h-4 text-gray-800" aria-hidden />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaYellow hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                                disabled={!canCheckIn}
                                title={dict.attendancePage.actionCheckIn ?? "Check in"}
                                aria-label={dict.attendancePage.actionCheckIn ?? "Check in"}
                                onClick={() => onToggle(row.id, true)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-4 h-4 text-gray-800"
                                  aria-hidden
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaSky hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                                disabled={!canCheckOut}
                                title={dict.attendancePage.actionCheckOut ?? "Check out"}
                                aria-label={dict.attendancePage.actionCheckOut ?? "Check out"}
                                onClick={() => onMarkPickedUp(row.id)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-4 h-4 text-gray-800"
                                  aria-hidden
                                >
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M12 7v5l3 2" />
                                </svg>
                              </button>
                              {canRevertAbsent ? (
                                <button
                                  type="button"
                                  className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaPurpleLight hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                                  disabled={!canSetAbsent}
                                  title={dict.attendancePage.actionSetAbsent ?? "Set absent"}
                                  aria-label={dict.attendancePage.actionSetAbsent ?? "Set absent"}
                                  onClick={() => onToggle(row.id, false)}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-4 h-4 text-gray-800"
                                    aria-hidden
                                  >
                                    <path d="M18 6 6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-white ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                                disabled={!canNotes || disabled}
                                title={dict.attendancePage.notesTooltip ?? dict.attendancePage.notes}
                                aria-label={dict.attendancePage.notesTooltip ?? dict.attendancePage.notes}
                                onClick={() => {
                                  setNotesModalStudentId(row.id);
                                  setNotesDraft(row.note ?? "");
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-4 h-4 text-gray-800"
                                  aria-hidden
                                >
                                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                                </svg>
                              </button>
                            </>
                          )}

                          {isParentView ? (
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                              disabled={parentAbsenceSending || parentMessageSending}
                              title={dict.dashboard.sendMessageKindergarten ?? "Message kindergarten"}
                              aria-label={dict.dashboard.sendMessageKindergarten ?? "Message kindergarten"}
                              onClick={() => {
                                setParentMessageStudentId(row.id);
                                setParentSubject("");
                                setParentMessage("");
                              }}
                            >
                              <Mail className="w-4 h-4 text-gray-800" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="print:hidden">
          <Pagination page={page} count={count} />
        </div>
      </div>

      {notesModalStudentId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-notes-modal-title"
          onClick={() => !isSavingNotes && setNotesModalStudentId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="attendance-notes-modal-title" className="text-sm font-semibold text-gray-900 mb-3">
              {dict.attendancePage.notesModalTitle ?? dict.attendancePage.notes}
            </h3>
            <textarea
              className="w-full min-h-[7rem] border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              disabled={isSavingNotes}
              placeholder={dict.attendancePage.notes}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                disabled={isSavingNotes}
                onClick={() => setNotesModalStudentId(null)}
              >
                {dict.common.close}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90 disabled:opacity-60"
                disabled={isSavingNotes}
                onClick={() => void onSaveNotesModal()}
              >
                {dict.common.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {parentAbsenceStudentId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-absence-modal-title"
          onClick={() => !parentAbsenceSending && setParentAbsenceStudentId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="parent-absence-modal-title" className="text-sm font-semibold text-gray-900 mb-3">
              {dict.dashboard.absenceReportTitle ?? dict.dashboard.reportAbsence ?? "Report absence"}
            </h3>
            <p className="text-xs text-gray-600 mb-3 tabular-nums">{todayStr()}</p>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {dict.dashboard.absenceOptionalNote ?? "Optional note"}
            </label>
            <textarea
              className="w-full min-h-[6rem] border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={parentAbsenceNote}
              onChange={(e) => setParentAbsenceNote(e.target.value)}
              disabled={parentAbsenceSending}
              placeholder="(optional)"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                disabled={parentAbsenceSending}
                onClick={() => setParentAbsenceStudentId(null)}
              >
                {dict.common.close}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90 disabled:opacity-60"
                disabled={parentAbsenceSending}
                onClick={() => {
                  const row = localRows.find((r) => r.id === parentAbsenceStudentId);
                  const fullName = row ? `${row.name} ${row.surname}` : parentAbsenceStudentId;
                  void onSendParentAbsenceEmail(parentAbsenceStudentId, fullName);
                }}
              >
                {parentAbsenceSending
                  ? (dict.dashboard.absenceSending ?? dict.dashboard.sending ?? "Sending…")
                  : (dict.dashboard.absenceSend ?? "Send")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {parentMessageStudentId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-message-modal-title"
          onClick={() => !parentMessageSending && setParentMessageStudentId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="parent-message-modal-title" className="text-sm font-semibold text-gray-900 mb-3">
              {dict.dashboard.messageKindergartenTitle ?? dict.dashboard.sendMessageKindergarten ?? "Message kindergarten"}
            </h3>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {dict.dashboard.messageSubject ?? "Subject (optional)"}
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none mb-3"
              value={parentSubject}
              onChange={(e) => setParentSubject(e.target.value)}
              disabled={parentMessageSending}
              placeholder={dict.dashboard.messageSubject ?? "Subject (optional)"}
            />
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {dict.dashboard.messageBody ?? "Message"}
            </label>
            <textarea
              className="w-full min-h-[7rem] border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              disabled={parentMessageSending}
              placeholder={dict.dashboard.messageBody ?? "Message"}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                disabled={parentMessageSending}
                onClick={() => setParentMessageStudentId(null)}
              >
                {dict.common.close}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90 disabled:opacity-60"
                disabled={parentMessageSending || !parentMessage.trim()}
                onClick={() => void onSendParentMessageEmail(parentMessageStudentId)}
              >
                {parentMessageSending
                  ? (dict.dashboard.sending ?? "Sending…")
                  : (dict.dashboard.send ?? "Send")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          thead {
            display: table-header-group;
          }
          tr,
          td,
          th {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
