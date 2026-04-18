"use client";

import AttendanceChart from "./AttendanceChart";
import DashboardChartOverflowMenu from "./DashboardChartOverflowMenu";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useMemo, useState } from "react";

export type AttendanceBarWeekRow = {
  name: string;
  present: number;
  absent: number;
};

type Mode = "children" | "educators";

export default function AttendanceChartContainerClient({
  childrenData,
  educatorData,
  showEducatorOption,
}: {
  childrenData: AttendanceBarWeekRow[];
  educatorData: AttendanceBarWeekRow[];
  showEducatorOption: boolean;
}) {
  const dict = useTranslations();
  const cm = dict.dashboard.chartMenu;
  const [mode, setMode] = useState<Mode>("children");

  const data = mode === "children" ? childrenData : educatorData;

  const menuItems = useMemo(
    () => [
      {
        id: "children",
        label: cm.childrenAttendance,
        selected: mode === "children",
        hidden: false,
        onSelect: () => setMode("children"),
      },
      {
        id: "educators",
        label: cm.educatorAttendance,
        selected: mode === "educators",
        hidden: !showEducatorOption,
        onSelect: () => setMode("educators"),
      },
    ],
    [mode, showEducatorOption, cm.childrenAttendance, cm.educatorAttendance]
  );

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center gap-2 shrink-0">
        <h1 className="text-lg font-semibold truncate min-w-0">
          {dict.dashboard.attendance}
        </h1>
        <DashboardChartOverflowMenu
          ariaLabel={cm.overflowAriaAttendance}
          items={menuItems.map((it) => ({
            id: it.id,
            label: it.label,
            selected: it.selected,
            onSelect: it.onSelect,
            hidden: it.hidden,
          }))}
        />
      </div>
      <div className="flex-1 min-h-0">
        <AttendanceChart data={data} />
      </div>
    </div>
  );
}
