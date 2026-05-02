"use client";

import { markTeacherAttendanceCheckedOut, upsertTeacherAttendance } from "@/lib/actions";
import WorkingDayDatePicker from "@/components/attendance/WorkingDayDatePicker";
import type { TeacherLite } from "@/components/PlayAreaCard";
import SearchInput from "@/components/search/SearchInput";
import FilterPanel from "@/components/filter/FilterPanel";
import FilterDropdown from "@/components/filter/FilterDropdown";
import ResetFiltersButton from "@/components/filter/ResetFiltersButton";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function TeachersAttendanceClient({
  dateStr,
  teachers,
  attendanceByTeacher: attendanceInitial,
  canEdit,
  viewerIsAdmin,
  showDatePicker = true,
  editableTeacherId = null,
}: {
  dateStr: string;
  teachers: TeacherLite[];
  attendanceByTeacher: Record<string, { present: boolean; actualPickupTime: string | null }>;
  canEdit: boolean;
  viewerIsAdmin: boolean;
  /** Hidden for teachers (today only). */
  showDatePicker?: boolean;
  /** When set (educator role), only this teacher row gets check-in/out actions. */
  editableTeacherId?: string | null;
}) {
  const dict = useTranslations();
  const ta = dict.teacherAttendancePage;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [localAttendance, setLocalAttendance] =
    useState<Record<string, { present: boolean; actualPickupTime: string | null }>>(attendanceInitial);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalAttendance(attendanceInitial);
  }, [attendanceInitial]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = actionsRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setActionsOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [actionsOpen]);

  type DerivedStatus = "absent" | "checked_in" | "checked_out";
  const deriveStatus = (tId: string): DerivedStatus => {
    const a = localAttendance[tId];
    if (!a?.present) return "absent";
    if (a.actualPickupTime) return "checked_out";
    return "checked_in";
  };

  /** Who may trigger mutations: admins for any row; teachers only on their own row (others still see buttons, disabled). */
  const mayMutateRow = (teacherId: string) =>
    viewerIsAdmin || (editableTeacherId != null && teacherId === editableTeacherId);

  const summary = useMemo(() => {
    let absent = 0;
    let checkedIn = 0;
    let checkedOut = 0;
    for (const t of teachers) {
      const s = deriveStatus(t.id);
      if (s === "absent") absent += 1;
      else if (s === "checked_out") checkedOut += 1;
      else checkedIn += 1;
    }
    return {
      total: teachers.length,
      absent,
      checkedIn,
      checkedOut,
    };
  }, [teachers, localAttendance]);

  const onToggle = async (teacherId: string, nextPresent: boolean) => {
    if (!canEdit) return;
    if (!viewerIsAdmin && teacherId !== editableTeacherId) return;
    setLocalAttendance((prev) => ({
      ...prev,
      [teacherId]: { present: nextPresent, actualPickupTime: null },
    }));
    const res = await upsertTeacherAttendance({
      teacherId,
      dateStr,
      present: nextPresent,
    });
    if (!res.success) {
      toast(ta.saveFailed);
      setLocalAttendance(attendanceInitial);
      return;
    }
    startTransition(() => router.refresh());
  };

  const nowHHmm = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const onCheckOut = async (teacherId: string) => {
    if (!canEdit) return;
    if (!viewerIsAdmin && teacherId !== editableTeacherId) return;
    const pickedUpAt = nowHHmm();
    setLocalAttendance((prev) => ({
      ...prev,
      [teacherId]: { present: true, actualPickupTime: pickedUpAt },
    }));
    const res = await markTeacherAttendanceCheckedOut({ teacherId, dateStr, pickedUpAt });
    if (!res.success) {
      toast(ta.saveFailed);
      setLocalAttendance(attendanceInitial);
      return;
    }
    startTransition(() => router.refresh());
  };

  const onPrint = () => {
    window.print();
  };

  const onDownloadPdf = async () => {
    try {
      const [jspdfMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const jsPDFConstructor = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default;
      if (typeof jsPDFConstructor !== "function") {
        throw new Error("Could not load jsPDF constructor.");
      }

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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(ta.title, left, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${ta.date}: ${dateStr}`, rightX, y, { align: "right" });
      y += 18;

      const head = [[ta.name, ta.status]];
      const body = teachers.map((t) => {
        const a = localAttendance[t.id] ?? { present: false, actualPickupTime: null };
        const kind = !a.present ? "absent" : a.actualPickupTime ? `checked_out::${a.actualPickupTime}` : "checked_in";
        return [`${t.name} ${t.surname}`.trim(), kind];
      });

      const autoTableMod = await import("jspdf-autotable");
      const autoTableFn = (autoTableMod as any).default ?? autoTableMod;
      if (typeof autoTableFn !== "function") {
        throw new Error("autoTable is not available.");
      }

      autoTableFn(doc, {
        head,
        body,
        startY: y,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.25 },
        headStyles: { fillColor: [248, 250, 252], textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 240 },
          1: { cellWidth: 220 },
        },
        margin: { left, right },
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          if (!data.column || data.column.index !== 1) return; // status column
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
          data.cell.styles.halign = "left";
          data.cell.styles.valign = "middle";
          data.cell.styles.cellPadding = { top: 4, right: 4, bottom: 4, left: 16 };
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          if (!data.column || data.column.index !== 1) return;
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
          const r = 3.2;
          const fontSize = Number(data.cell.styles?.fontSize) || 9;
          const cx = x + 9;
          const cy = y + 4 + fontSize * 0.8;
          const rgb =
            kind === "checked_in"
              ? [34, 197, 94]
              : kind === "checked_out"
                ? [14, 165, 233]
                : [244, 63, 94];
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          doc.circle(cx, cy, r, "F");
        },
      });

      doc.save(`educator_attendance_${dateStr}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
      toast(`${ta.saveFailed}${msg ? `: ${msg}` : ""}`);
    }
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{ta.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewerIsAdmin ? ta.subtitle : ta.subtitleEducator}
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-xl">
            {viewerIsAdmin ? ta.boardHint : ta.boardHintEducator}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />
          <div className="flex flex-wrap gap-3 items-center justify-end self-end">
          {showDatePicker ? (
            <label className="flex flex-col gap-1 text-sm">
              <WorkingDayDatePicker
                value={dateStr}
                disabled={isPending}
                ariaLabel={ta.date}
                onChange={(next) =>
                  startTransition(() =>
                    router.replace(`${pathname}?date=${encodeURIComponent(next)}`)
                  )
                }
              />
            </label>
          ) : null}
          <FilterPanel title={dict.common.filters}>
            <FilterDropdown
              label={ta.status}
              paramKey="status"
              options={[
                { label: dict.attendancePage.statusAbsent ?? "Absent", value: "absent" },
                { label: dict.attendancePage.statusCheckedIn ?? "Checked-in", value: "checked_in" },
                { label: dict.attendancePage.statusCheckedOut ?? "Checked-out", value: "checked_out" },
              ]}
            />
          </FilterPanel>
          <ResetFiltersButton label={dict.common.resetFilters ?? "Reset filters"} />
          <div className="relative flex items-center" ref={actionsRef}>
            <button
              type="button"
              className="h-[36px] w-[36px] rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => setActionsOpen((v) => !v)}
              aria-label={dict.common.actions ?? "Actions"}
              title={dict.common.actions ?? "Actions"}
              disabled={isPending}
            >
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
            {actionsOpen ? (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setActionsOpen(false);
                    onPrint();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                    aria-hidden
                  >
                    <path d="M6 9V3h12v6" />
                    <rect x="6" y="14" width="12" height="7" rx="1" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  </svg>
                  <span>{dict.attendancePage.printPdf ?? "Print"}</span>
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setActionsOpen(false);
                    void onDownloadPdf();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                    aria-hidden
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  <span>{dict.attendancePage.downloadPdf ?? "Download PDF"}</span>
                </button>
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{ta.totalEducators}</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.statusAbsent ?? "Absent"}</p>
          <p className="text-2xl font-semibold text-rose-700">{summary.absent}</p>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.statusCheckedIn ?? "Checked-in"}</p>
          <p className="text-2xl font-semibold text-emerald-700">{summary.checkedIn}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.attendancePage.statusCheckedOut ?? "Checked-out"}</p>
          <p className="text-2xl font-semibold text-gray-800">{summary.checkedOut}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print:overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-left">
                <th className="p-3 sm:p-4 font-medium text-gray-700">
                  {ta.name}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 w-[12rem]">{ta.status}</th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 w-[10rem]">
                  {dict.common.actions ?? "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    {ta.noTeachers}
                  </td>
                </tr>
              ) : (
                teachers.map((t) => {
                  const a = localAttendance[t.id] ?? { present: false, actualPickupTime: null };
                  const status = deriveStatus(t.id);
                  const rowMayMutate = mayMutateRow(t.id);
                  const disabled = !canEdit || isPending;
                  const canCheckIn = rowMayMutate && !disabled && status === "absent";
                  const canCheckOut = rowMayMutate && !disabled && status === "checked_in";
                  const canSetAbsent =
                    viewerIsAdmin && rowMayMutate && !disabled && status !== "absent";
                  const dotClass =
                    status === "absent"
                      ? "bg-rose-500"
                      : status === "checked_in"
                        ? "bg-emerald-500"
                        : "bg-sky-500";
                  const statusLabel =
                    status === "absent"
                      ? (dict.attendancePage.statusAbsent ?? "Absent")
                      : status === "checked_in"
                        ? (dict.attendancePage.statusCheckedIn ?? "Checked-in")
                        : (dict.attendancePage.statusCheckedOut ?? "Checked-out");
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-100 even:bg-slate-50/60 hover:bg-kitaPurpleLight/40"
                    >
                      <td className="p-3 sm:p-4 font-medium text-gray-900">
                        {t.name} {t.surname}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="grid grid-cols-[12px_1fr] items-start gap-x-2.5 gap-y-0.5">
                          <span className={`mt-[3px] h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
                          <span className="text-xs font-semibold text-gray-900 leading-snug">
                            {statusLabel}
                          </span>
                          {status === "checked_out" && a.actualPickupTime ? (
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
                                <span>{a.actualPickupTime}</span>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaYellow hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                            disabled={!canCheckIn}
                            title={dict.attendancePage.actionCheckIn ?? "Check in"}
                            aria-label={dict.attendancePage.actionCheckIn ?? "Check in"}
                            onClick={() => onToggle(t.id, true)}
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
                            onClick={() => onCheckOut(t.id)}
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
                          {viewerIsAdmin ? (
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaPurpleLight hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                              disabled={!canSetAbsent}
                              title={dict.attendancePage.actionSetAbsent ?? "Set absent"}
                              aria-label={dict.attendancePage.actionSetAbsent ?? "Set absent"}
                              onClick={() => onToggle(t.id, false)}
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
                        </div>
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
