"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import Performance, { FavouriteActivitySlice } from "@/components/Performance";
import DashboardChartOverflowMenu from "@/components/DashboardChartOverflowMenu";

type Mode = "planned" | "current";

export default function TeacherPlannedAreaCard({
  plannedActivities,
  currentAreaLabel,
  currentBadgeLabel,
  strings,
}: {
  plannedActivities: FavouriteActivitySlice[];
  currentAreaLabel: string;
  currentBadgeLabel: string;
  strings: {
    plannedTitle: string;
    plannedMenuLabel: string;
    currentTitle: string;
    overflowAria: string;
    noPlanned: string;
  };
}) {
  const [mode, setMode] = useState<Mode>("planned");

  const items = useMemo(
    () => [
      {
        id: "planned",
        label: strings.plannedMenuLabel,
        selected: mode === "planned",
        onSelect: () => setMode("planned"),
      },
      {
        id: "current",
        label: strings.currentTitle,
        selected: mode === "current",
        onSelect: () => setMode("current"),
      },
    ],
    [mode, strings]
  );

  const title = mode === "planned" ? strings.plannedTitle : strings.currentTitle;

  return (
    <div className="bg-white p-4 rounded-md h-80 relative flex flex-col">
      <div className="flex items-start justify-between gap-3 shrink-0 mb-2">
        <h1 className="text-xl font-semibold min-w-0">{title}</h1>
        <DashboardChartOverflowMenu ariaLabel={strings.overflowAria} items={items} />
      </div>

      {mode === "planned" ? (
        plannedActivities.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500 text-center px-4">
            {strings.noPlanned}
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <Performance activities={plannedActivities} omitHeader />
          </div>
        )
      ) : (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 text-center px-4 pb-2">
          <MapPin
            className="w-12 h-12 shrink-0 text-kitaYellow"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="min-w-0 w-full space-y-2">
            <div className="text-2xl sm:text-[1.75rem] font-bold text-gray-900 break-words leading-snug">
              {currentAreaLabel}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 justify-items-center">
            <span className="text-xs font-medium text-gray-800 bg-white/75 border border-gray-200/80 rounded-full px-3 py-1.5 shadow-sm">
              {currentBadgeLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
