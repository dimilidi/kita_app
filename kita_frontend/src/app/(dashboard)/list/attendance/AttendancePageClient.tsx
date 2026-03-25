"use client";

import { saveDailyAttendance } from "@/lib/actions";
import { todayDateStrLocal } from "@/lib/attendanceDate";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useTransition } from "react";
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

  return (
    <div className="flex-1 p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
            className="text-sm text-kitaPurple hover:underline self-end mb-1"
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
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
                        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggle(row.id, true)}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${
                              row.present
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {dict.dashboard.present}
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggle(row.id, false)}
                            className={`px-3 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${
                              !row.present
                                ? "bg-rose-600 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {dict.dashboard.absent}
                          </button>
                        </div>
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
    </div>
  );
}
