"use client";

import {
  getAttendanceRowsForPdfExport,
  saveAttendanceDayDetail,
  saveDailyAttendance,
  saveDailyAttendanceForLessonMany,
  saveDailyAttendanceForAttendancePageFilterAll,
} from "@/lib/actions";
import Pagination from "@/components/Pagination";
import { todayDateStrLocal } from "@/lib/attendanceDate";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useTransition, useState } from "react";
import { toast } from "react-toastify";
import type { AttendanceRow } from "./types";

export type { AttendanceRow };

export default function AttendancePageClient({
  dateStr,
  classId,
  rows,
  count,
  page,
  summary,
  classes,
  canEdit,
}: {
  dateStr: string;
  classId: string;
  rows: AttendanceRow[];
  count: number;
  page: number;
  summary: { total: number; presentCount: number; absentCount: number };
  classes: { id: number; name: string }[];
  canEdit: boolean;
}) {
  const dict = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [pickupModalStudentId, setPickupModalStudentId] = useState<string | null>(null);
  const [pickupDraft, setPickupDraft] = useState("");
  const [isSavingPickup, setIsSavingPickup] = useState(false);
  const [localRows, setLocalRows] = useState<AttendanceRow[]>(rows);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [globalPresentOverride, setGlobalPresentOverride] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalRows(rows);
    setGlobalPresentOverride(null);
  }, [rows]);

  useEffect(() => {
    if (!pickupModalStudentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickupModalStudentId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickupModalStudentId]);

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
    const params = new URLSearchParams();
    params.set("date", next.date ?? dateStr);
    params.set("classId", next.classId ?? classId);
    return params.toString();
  };

  const { total, presentCount, absentCount } = summary;

  const editableRows = localRows.filter((r) => !!r.lessonId);
  const editableCount = editableRows.length;
  const presentEditableCount = editableRows.reduce((acc, r) => acc + (r.present ? 1 : 0), 0);
  const allEditablePresent = editableCount > 0 && presentEditableCount === editableCount;
  const noneEditablePresent = presentEditableCount === 0;
  const someEditablePresent = presentEditableCount > 0 && !allEditablePresent;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someEditablePresent && !allEditablePresent;
  }, [someEditablePresent, allEditablePresent]);

  // Keep summary cards responsive to optimistic local changes.
  // Summary values are for all filtered students (not just the current page),
  // so we apply a delta from the current page rows.
  const basePagePresentCount = rows.reduce((acc, r) => acc + (r.present ? 1 : 0), 0);
  const localPagePresentCount = localRows.reduce((acc, r) => acc + (r.present ? 1 : 0), 0);
  const presentCountDisplayUnclamped =
    globalPresentOverride === null
      ? presentCount + (localPagePresentCount - basePagePresentCount)
      : globalPresentOverride
        ? total
        : 0;
  const presentCountDisplay = Math.max(0, Math.min(total, presentCountDisplayUnclamped));
  const absentCountDisplay = total - presentCountDisplay;

  const onToggle = async (studentId: string, nextPresent: boolean) => {
    if (!canEdit) return;
    setGlobalPresentOverride(null);
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

  const onToggleAll = async (nextPresent: boolean) => {
    if (!canEdit) return;
    setGlobalPresentOverride(nextPresent);
    // optimistic update for rows that have a lesson
    setLocalRows((prev) =>
      prev.map((r) => (r.lessonId ? { ...r, present: nextPresent } : r))
    );

    // Persist: on page 1, this checkbox should update *all* matching students.
    // On other pages the checkbox is hidden, but keep this logic robust.
    const resGlobal = await saveDailyAttendanceForAttendancePageFilterAll({
      dateStr,
      classIdParam: classId,
      present: nextPresent,
    });
    if (!resGlobal.success) {
      toast(dict.attendancePage.saveFailed);
      setLocalRows(rows);
      setGlobalPresentOverride(null);
      return;
    }
    startTransition(() => router.refresh());
  };

  const onSaveNoteBlur = async (studentId: string, note: string) => {
    if (!canEdit) return;
    const res = await saveAttendanceDayDetail({
      studentId,
      dateStr,
      note: note.trim() ? note.trim() : null,
    });
    if (!res.success) {
      toast(dict.attendancePage.detailSaveFailed);
      return;
    }
    startTransition(() => router.refresh());
  };

  const savePickupOverride = async (studentId: string, value: string) => {
    if (!canEdit) return;
    const res = await saveAttendanceDayDetail({
      studentId,
      dateStr,
      actualPickupTime: value.trim() ? value.trim() : null,
    });
    if (!res.success) {
      toast(dict.attendancePage.detailSaveFailed);
      return;
    }
    startTransition(() => router.refresh());
  };

  const onSavePickupModal = async () => {
    if (!pickupModalStudentId || isSavingPickup) return;
    setIsSavingPickup(true);
    try {
      await savePickupOverride(pickupModalStudentId, pickupDraft);
      setPickupModalStudentId(null);
    } finally {
      setIsSavingPickup(false);
    }
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
      doc.text(`${dict.dashboard.present}: ${presentCount}`, left, y);
      y += 12;
      doc.text(`${dict.dashboard.absent}: ${absentCount}`, left, y);
      y += 12;
      const startY = y + 8;

      const head = [
        [
          dict.attendancePage.childName,
          dict.attendancePage.group,
          dict.attendancePage.status,
          dict.forms.pickupTime,
          dict.attendancePage.notes,
        ],
      ];

      const body = pdfRows.map((row) => [
        `${row.name} ${row.surname}`.trim(),
        row.className ?? "—",
        // Keep the status cell clean:
        // - present: we will draw a filled circle via didDrawCell (no unicode symbols)
        // - absent: empty
        row.present ? "1" : "",
        row.displayPickupTime ?? "—",
        row.note ?? "",
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
          0: { cellWidth: 150 },
          1: { cellWidth: 70, halign: "right" },
          2: { cellWidth: 52, halign: "center" },
          3: { cellWidth: 110 },
          4: { cellWidth: 120 },
        },
        margin: { left, right },
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          if (!data.column || data.column.index !== 2) return; // status column

          const raw = data.cell?.raw;
          const text =
            typeof raw === "string" ? raw : Array.isArray(raw) ? raw.join(" ") : String(raw ?? "");
          const isPresent = text.trim() === "1";

          // Don't render any text in the cell; we'll draw the dot ourselves.
          data.cell.text = [""];
          if (isPresent) data.cell.styles.halign = "center";
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          if (!data.column || data.column.index !== 2) return;

          const raw = data.cell?.raw;
          const text =
            typeof raw === "string"
              ? raw
              : Array.isArray(raw)
                ? raw.join(" ")
                : String(raw ?? "");
          const isPresent = text.trim() === "1";
          if (!isPresent) return;

          // Draw a filled circle in the status cell.
          const { x, y, width, height } = data.cell;
          const r = Math.max(3, Math.min(width, height) / 6);
          const cx = x + width / 2;
          const cy = y + height / 2;

          doc.setFillColor(34, 197, 94); // green dot
          doc.setDrawColor(34, 197, 94);
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
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{dict.attendancePage.date}</span>
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={dateStr}
              disabled={isPending}
              onChange={(e) =>
                startTransition(() =>
                  router.replace(
                    `${pathname}?${buildQuery({ date: e.target.value })}`
                  )
                )
              }
            />
          </label>
          <button
            type="button"
            className="self-end h-[42px] px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                router.replace(
                  `${pathname}?${buildQuery({ date: todayDateStrLocal() })}`
                )
              )
            }
          >
            {dict.attendancePage.today}
          </button>
          <label className="flex flex-col gap-1 text-sm min-w-[12rem]">
            <span className="text-gray-600">{dict.attendancePage.filterGroup}</span>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={classId}
              disabled={isPending}
              onChange={(e) =>
                startTransition(() =>
                  router.replace(
                    `${pathname}?${buildQuery({ classId: e.target.value })}`
                  )
                )
              }
            >
              <option value="all">{dict.attendancePage.allGroups}</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {canEdit && (
            <div className="relative self-end" ref={actionsRef}>
              <button
                type="button"
                className={`h-[42px] w-[42px] rounded-md border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 ${
                  isDownloadingPdf ? "opacity-60 cursor-not-allowed" : ""
                }`}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.totalChildren}</p>
          <p className="text-2xl font-semibold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.dashboard.present}</p>
          <p className="text-2xl font-semibold text-emerald-700">{presentCountDisplay}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.dashboard.absent}</p>
          <p className="text-2xl font-semibold text-rose-700">{absentCountDisplay}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print:overflow-visible">
        <div className="overflow-x-auto overscroll-x-contain print:overflow-visible [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-left">
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[9rem] align-top">
                  {dict.attendancePage.childName}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[5rem] align-top">
                  {dict.attendancePage.group}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[8.5rem] align-top">
                  <div className="flex flex-col gap-2">
                    <span>{dict.attendancePage.status}</span>
                    {canEdit && page === 1 ? (
                      <label className="inline-flex items-center gap-2 font-normal">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4"
                          disabled={isPending || editableCount === 0}
                          checked={editableCount > 0 && allEditablePresent}
                          onChange={(e) => onToggleAll(e.target.checked)}
                          aria-label={dict.common.selectAll ?? "Select all"}
                          title={dict.common.selectAll ?? "Select all"}
                        />
                        <span className="text-xs text-gray-700">
                          {someEditablePresent ? "Mixed" : allEditablePresent ? "All Present" : "All Absent"}
                        </span>
                      </label>
                    ) : null}
                  </div>
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[10rem] align-top">
                  {dict.forms.pickupTime}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 min-w-[12rem] align-top">
                  {dict.attendancePage.notes}
                </th>
              </tr>
            </thead>
            <tbody>
              {localRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {dict.attendancePage.noStudents}
                  </td>
                </tr>
              ) : (
                localRows.map((row) => {
                  const disabled = !canEdit || !row.lessonId || isPending;
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
                      <td className="p-3 sm:p-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            disabled={disabled}
                            checked={row.present}
                            onChange={(e) => onToggle(row.id, e.target.checked)}
                          />
                          <span className="text-xs text-gray-700">
                            {row.present
                              ? dict.dashboard.present
                              : dict.dashboard.absent}
                          </span>
                        </label>
                        {!row.lessonId && (
                          <p className="text-xs text-amber-600 mt-1">
                            {dict.attendancePage.noLessonShort}
                          </p>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 align-middle min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-xs text-gray-900 tabular-nums min-w-0 break-words">
                            {row.displayPickupTime ?? "—"}
                          </span>
                          {canEdit && row.lessonId ? (
                            <button
                              type="button"
                              className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                              disabled={disabled}
                              aria-label={dict.attendancePage.pickupEditModalTitle}
                              title={dict.attendancePage.pickupEditModalTitle}
                              onClick={() => {
                                setPickupModalStudentId(row.id);
                                setPickupDraft(row.actualPickupTime ?? "");
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-4 h-4 text-gray-600"
                                aria-hidden
                              >
                                <circle cx="12" cy="5.5" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="18.5" r="1.5" fill="currentColor" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 align-top min-w-0">
                        {canEdit && row.lessonId ? (
                          <textarea
                            className="w-full min-h-[3rem] border rounded-md px-2 py-1 text-xs"
                            defaultValue={row.note ?? ""}
                            disabled={disabled}
                            onBlur={(e) => onSaveNoteBlur(row.id, e.target.value)}
                            placeholder={dict.attendancePage.notes}
                          />
                        ) : (
                          <span className="text-xs text-gray-600 break-words">
                            {row.note ?? "—"}
                          </span>
                        )}
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
      {pickupModalStudentId ? (
        (() => {
          const modalRow = localRows.find((r) => r.id === pickupModalStudentId);
          if (!modalRow) return null;
          return (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 print:hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pickup-modal-title"
              onClick={() => !isSavingPickup && setPickupModalStudentId(null)}
            >
              <div
                className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  id="pickup-modal-title"
                  className="text-sm font-semibold text-gray-900 mb-3"
                >
                  {dict.attendancePage.pickupEditModalTitle}
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  <span className="text-gray-600">
                    {dict.attendancePage.defaultPickupLabel}:
                  </span>{" "}
                  <span className="font-medium text-gray-800 tabular-nums">
                    {modalRow.defaultPickupTime ?? "—"}
                  </span>
                </p>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {dict.attendancePage.pickupOverride}
                </label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
                  value={pickupDraft}
                  onChange={(e) => setPickupDraft(e.target.value)}
                  disabled={isSavingPickup}
                />
                <p className="text-[10px] text-gray-400 mt-2">
                  {dict.attendancePage.pickupOverrideHint}
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                    disabled={isSavingPickup}
                    onClick={() => setPickupModalStudentId(null)}
                  >
                    {dict.common.close}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90"
                    disabled={isSavingPickup}
                    onClick={() => onSavePickupModal()}
                  >
                    {dict.common.save}
                  </button>
                </div>
              </div>
            </div>
          );
        })()
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
