"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "@/i18n/TranslationsProvider";
import type { OverviewDatum } from "@/lib/attendanceOverviewStats";

type RangeMode = "month" | "year";

/** Match FinanceChart line colors (income / expense). */
const CHILDREN_STROKE = "#C3EBFA";
const EDUCATORS_STROKE = "#CFCEFF";

function formatTooltipPeriod(isoDate: string, mode: RangeMode, locale: string) {
  const [y, m, d] = isoDate.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (mode === "month") {
    return dt.toLocaleDateString(locale, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return dt.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AttendanceOverviewChart({
  monthData,
  yearData,
}: {
  monthData: OverviewDatum[];
  yearData: OverviewDatum[];
}) {
  const dict = useTranslations();
  const pathname = usePathname();
  const ao = dict.dashboard.attendanceOverview;
  const [mode, setMode] = useState<RangeMode>("month");

  const data = mode === "month" ? monthData : yearData;

  const localeSeg = pathname.split("/").filter(Boolean)[0];
  const tooltipLocale = localeSeg === "de" ? "de-DE" : "en-GB";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const rangeItems: { key: RangeMode; label: string }[] = [
    { key: "month", label: ao.thisMonth },
    { key: "year", label: ao.thisYear },
  ];

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">{ao.title}</h1>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="rounded-md p-0.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-kitaPurple/40"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={ao.rangeToggle}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Image src="/moreDark.png" alt="" width={20} height={20} />
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-full z-40 mt-1.5 min-w-[12rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              {rangeItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={mode === item.key}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    mode === item.key
                      ? "bg-kitaPurpleLight/50 font-medium text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setMode(item.key);
                    setMenuOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {mode === item.key ? (
                    <span className="text-kitaPurple shrink-0" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <span className="w-4 shrink-0" aria-hidden />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={20}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              borderColor: "lightgray",
              background: "#fff",
            }}
            formatter={(value, name) => [value ?? "", String(name)]}
            labelFormatter={(_label, payload) => {
              const row = payload?.[0]?.payload as OverviewDatum | undefined;
              if (!row?.isoDate) return _label;
              return formatTooltipPeriod(row.isoDate, mode, tooltipLocale);
            }}
          />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            name={dict.dashboard.children}
            dataKey="childrenPresent"
            stroke={CHILDREN_STROKE}
            strokeWidth={5}
          />
          <Line
            type="monotone"
            name={dict.dashboard.educators}
            dataKey="educatorsPresent"
            stroke={EDUCATORS_STROKE}
            strokeWidth={5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
