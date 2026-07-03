"use client";

import { THESIS_DEMO_WEEKENDS_ENABLED } from "@/lib/thesisDemoConfig";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useEffect, useMemo, useRef, useState } from "react";

function dateStrToLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

function localDateToDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function isWeekendLocal(d: Date) {
  // THESIS DEMO: allow Saturday/Sunday selection in date pickers.
  if (THESIS_DEMO_WEEKENDS_ENABLED) return false;
  const dow = d.getDay(); // local day of week
  return dow === 0 || dow === 6;
}

export default function WorkingDayDatePicker({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (nextDateStr: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const valueDate = useMemo(() => dateStrToLocalDate(value) ?? new Date(), [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="border rounded-md px-3 py-2 text-sm bg-white h-[42px] min-w-[11rem] flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={() => setOpen((v) => !v)}
        disabled={!!disabled}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <span className="font-medium text-gray-800 tabular-nums">{value}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4 text-gray-600"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && !disabled ? (
        <div className="absolute right-0 mt-2 z-50 rounded-md border border-gray-200 bg-white shadow-lg p-2">
          <Calendar
            value={valueDate}
            onClickDay={(d) => {
              if (isWeekendLocal(d)) return;
              onChange(localDateToDateStr(d));
              setOpen(false);
            }}
            tileDisabled={({ date, view }) =>
              view === "month" ? isWeekendLocal(date) : false
            }
            prev2Label={null}
            next2Label={null}
          />
        </div>
      ) : null}
    </div>
  );
}

