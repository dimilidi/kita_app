"use client";

import { markTeacherAttendanceCheckedOut, upsertTeacherAttendance } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

type Status = "absent" | "checked_in" | "checked_out";

type Props = {
  teacherId: string;
  dateStr: string;
  initialPresent: boolean;
  initialPickupTime: string | null;
  canEdit: boolean;
  strings: {
    /** Full weekday + calendar date (locale-aware, from server). */
    dateHeading: string;
    yourAttendance: string;
    attendance: string;
    statusAbsent: string;
    statusCheckedIn: string;
    statusCheckedOut: string;
    actionCheckIn: string;
    actionCheckOut: string;
    saveFailed: string;
  };
};

export default function TeacherTodayAttendanceCardClient({
  teacherId,
  dateStr,
  initialPresent,
  initialPickupTime,
  canEdit,
  strings,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [present, setPresent] = useState(initialPresent);
  const [pickupTime, setPickupTime] = useState<string | null>(initialPickupTime);

  useEffect(() => {
    setPresent(initialPresent);
    setPickupTime(initialPickupTime);
  }, [initialPresent, initialPickupTime]);

  const status: Status = useMemo(() => {
    if (!present) return "absent";
    if (pickupTime) return "checked_out";
    return "checked_in";
  }, [present, pickupTime]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "checked_out":
        return strings.statusCheckedOut;
      case "checked_in":
        return strings.statusCheckedIn;
      default:
        return strings.statusAbsent;
    }
  }, [status, strings]);

  const dotClass =
    status === "absent"
      ? "bg-rose-500"
      : status === "checked_in"
        ? "bg-emerald-500"
        : "bg-sky-500";

  const nowHHmm = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const refresh = () => startTransition(() => router.refresh());

  const onCheckIn = async () => {
    if (!canEdit || isPending) return;
    setPresent(true);
    setPickupTime(null);
    const res = await upsertTeacherAttendance({
      teacherId,
      dateStr,
      present: true,
    });
    if (!res.success) {
      toast.error(strings.saveFailed);
      setPresent(initialPresent);
      setPickupTime(initialPickupTime);
      return;
    }
    refresh();
  };

  const onCheckOut = async () => {
    if (!canEdit || isPending) return;
    const pickedUpAt = nowHHmm();
    setPresent(true);
    setPickupTime(pickedUpAt);
    const res = await markTeacherAttendanceCheckedOut({
      teacherId,
      dateStr,
      pickedUpAt,
    });
    if (!res.success) {
      toast.error(strings.saveFailed);
      setPresent(initialPresent);
      setPickupTime(initialPickupTime);
      return;
    }
    refresh();
  };

  const canCheckIn = canEdit && status === "absent";
  const canCheckOut = canEdit && status === "checked_in";

  return (
    <div className="rounded-md bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-500">{strings.dateHeading}</div>
          <h2 className="text-lg font-semibold text-gray-900">{strings.yourAttendance}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            className="rounded-md bg-kitaYellow px-3 py-2 text-xs font-medium text-gray-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canCheckIn}
            onClick={() => void onCheckIn()}
          >
            {strings.actionCheckIn}
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canCheckOut}
            onClick={() => void onCheckOut()}
          >
            {strings.actionCheckOut}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md bg-slate-50 border border-gray-200 p-3 sm:col-span-1">
          <div className="text-[11px] text-gray-500">{strings.attendance}</div>
          <div className="mt-1 grid grid-cols-[12px_1fr] items-start gap-x-2.5 gap-y-0.5">
            <span className={`mt-[3px] h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 leading-snug">{statusLabel}</div>
              {status === "checked_out" && pickupTime ? (
                <div className="text-[11px] text-gray-600 tabular-nums">{pickupTime}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
