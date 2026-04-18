"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">{ao.title}</h1>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
            role="group"
            aria-label={ao.rangeToggle}
          >
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "month"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setMode("month")}
            >
              {ao.thisMonth}
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "year"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setMode("year")}
            >
              {ao.thisYear}
            </button>
          </div>
          <Image src="/moreDark.png" alt="" width={20} height={20} />
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
