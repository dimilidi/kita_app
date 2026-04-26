"use client";

import { upsertTeacherAttendance } from "@/lib/actions";
import { todayDateStrLocal } from "@/lib/attendanceDate";
import WorkingDayDatePicker from "@/components/attendance/WorkingDayDatePicker";
import type { TeacherLite } from "@/components/PlayAreaCard";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function TeachersAttendanceClient({
  dateStr,
  teachers,
  attendanceByTeacher: attendanceInitial,
  canEdit,
  viewerIsAdmin,
}: {
  dateStr: string;
  teachers: TeacherLite[];
  attendanceByTeacher: Record<string, boolean>;
  canEdit: boolean;
  viewerIsAdmin: boolean;
}) {
  const dict = useTranslations();
  const ta = dict.teacherAttendancePage;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [localAttendance, setLocalAttendance] =
    useState<Record<string, boolean>>(attendanceInitial);

  useEffect(() => {
    setLocalAttendance(attendanceInitial);
  }, [attendanceInitial]);

  const summary = useMemo(() => {
    let present = 0;
    for (const t of teachers) {
      if (localAttendance[t.id] === true) present += 1;
    }
    return {
      total: teachers.length,
      present,
      absent: teachers.length - present,
    };
  }, [teachers, localAttendance]);

  const onToggle = async (teacherId: string, nextPresent: boolean) => {
    if (!canEdit) return;
    setLocalAttendance((prev) => ({ ...prev, [teacherId]: nextPresent }));
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

  return (
    <div className="flex-1 p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{ta.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewerIsAdmin ? ta.subtitle : ta.subtitleEducator}
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-xl">
            {viewerIsAdmin ? ta.boardHint : ta.boardHintEducator}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{ta.date}</span>
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
          <button
            type="button"
            className="self-end h-[42px] px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                router.replace(`${pathname}?date=${todayDateStrLocal()}`)
              )
            }
          >
            {ta.today}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{ta.totalEducators}</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.dashboard.present}</p>
          <p className="text-2xl font-semibold text-emerald-700">{summary.present}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{dict.dashboard.absent}</p>
          <p className="text-2xl font-semibold text-rose-700">{summary.absent}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-left">
                <th className="p-3 sm:p-4 font-medium text-gray-700">
                  {ta.name}
                </th>
                <th className="p-3 sm:p-4 font-medium text-gray-700 w-[10rem]">
                  {ta.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-gray-500">
                    {ta.noTeachers}
                  </td>
                </tr>
              ) : (
                teachers.map((t) => {
                  const present = localAttendance[t.id] === true;
                  const disabled = !canEdit || isPending;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-100 even:bg-slate-50/60 hover:bg-kitaPurpleLight/40"
                    >
                      <td className="p-3 sm:p-4 font-medium text-gray-900">
                        {t.name} {t.surname}
                      </td>
                      <td className="p-3 sm:p-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            disabled={disabled}
                            checked={present}
                            onChange={(e) => onToggle(t.id, e.target.checked)}
                          />
                          <span className="text-gray-700">
                            {present ? ta.presentLabel : ta.absentLabel}
                          </span>
                        </label>
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
