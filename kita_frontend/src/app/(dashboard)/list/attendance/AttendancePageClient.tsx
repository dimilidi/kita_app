"use client";

import { saveDailyAttendance } from "@/lib/actions";
import { todayDateStrLocal } from "@/lib/attendanceDate";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useTransition, useState } from "react";
import { toast } from "react-toastify";

export type AttendanceRow = {
  id: string;
  name: string;
  surname: string;
  classId: number;
  className: string;
  lessonId: number | null;
  present: boolean;
};

export default function AttendancePageClient({
  dateStr,
  classId,
  rows,
  classes,
  canEdit,
}: {
  dateStr: string;
  classId: string;
  rows: AttendanceRow[];
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

  const { total, presentCount, absentCount } = useMemo(() => {
    const total = rows.length;
    const presentCount = rows.filter((r) => r.present).length;
    return {
      total,
      presentCount,
      absentCount: total - presentCount,
    };
  }, [rows]);

  const onToggle = async (studentId: string, nextPresent: boolean) => {
    if (!canEdit) return;
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
      return;
    }
    startTransition(() => router.refresh());
  };

  const onDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
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
        ],
      ];

      const body = rows.map((row) => [
        `${row.name} ${row.surname}`.trim(),
        row.className ?? "—",
        // Keep the status cell clean:
        // - present: we will draw a filled circle via didDrawCell (no unicode symbols)
        // - absent: empty
        row.present ? "1" : "",
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
          0: { cellWidth: 220 },
          1: { cellWidth: 120, halign: "right" },
          2: { cellWidth: 90, halign: "center" },
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
                    <span>Download PDF</span>
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
          <p className="text-2xl font-semibold text-emerald-700">{presentCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.dashboard.absent}</p>
          <p className="text-2xl font-semibold text-rose-700">{absentCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-left">
                <th className="p-4 font-medium text-gray-700">
                  {dict.attendancePage.childName}
                </th>
                <th className="p-4 font-medium text-gray-700 hidden sm:table-cell">
                  {dict.attendancePage.group}
                </th>
                <th className="p-4 font-medium text-gray-700 w-[min(100%,14rem)]">
                  {dict.attendancePage.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    {dict.attendancePage.noStudents}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const disabled = !canEdit || !row.lessonId || isPending;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 even:bg-slate-50/60 hover:bg-kitaPurpleLight/40"
                    >
                      <td className="p-4 font-medium text-gray-900">
                        {row.name} {row.surname}
                      </td>
                      <td className="p-4 text-gray-600 hidden sm:table-cell">
                        {row.className}
                      </td>
                      <td className="p-4">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
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
