"use client";

import CountChart from "./CountChart";
import DashboardChartOverflowMenu from "./DashboardChartOverflowMenu";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useMemo, useState } from "react";

type View = "children" | "educators";

export default function CountChartContainerClient({
  boys,
  girls,
  educatorMale,
  educatorFemale,
  canShowEducators,
}: {
  boys: number;
  girls: number;
  educatorMale: number;
  educatorFemale: number;
  /** False when there are no educators in the directory (sex counts all zero). */
  canShowEducators: boolean;
}) {
  const dict = useTranslations();
  const cm = dict.dashboard.chartMenu;
  const [view, setView] = useState<View>("children");

  const childTotal = boys + girls;
  const educatorTotal = educatorMale + educatorFemale;

  const { yellowCount, blueCount, firstLabel, secondLabel } = useMemo(() => {
    if (view === "children") {
      return {
        yellowCount: girls,
        blueCount: boys,
        firstLabel: dict.dashboard.boys,
        secondLabel: dict.dashboard.girls,
      };
    }
    return {
      yellowCount: educatorFemale,
      blueCount: educatorMale,
      firstLabel: dict.forms.male,
      secondLabel: dict.forms.female,
    };
  }, [view, boys, girls, educatorMale, educatorFemale, dict]);

  const pct = (n: number, total: number) => {
    if (total <= 0) return 0;
    return Math.round((n / total) * 100);
  };

  const totalForView =
    view === "children" ? childTotal : educatorTotal;
  const primaryCount = view === "children" ? boys : educatorMale;
  const secondaryCount = view === "children" ? girls : educatorFemale;

  const menuItems = useMemo(
    () => [
      {
        id: "children",
        label: cm.showChildren,
        selected: view === "children",
        hidden: false,
        onSelect: () => setView("children"),
      },
      {
        id: "educators",
        label: cm.showEducators,
        selected: view === "educators",
        hidden: !canShowEducators,
        onSelect: () => setView("educators"),
      },
    ],
    [view, canShowEducators, cm.showChildren, cm.showEducators]
  );

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-lg font-semibold truncate min-w-0">
          {view === "children"
            ? dict.dashboard.children
            : dict.dashboard.educators}
        </h1>
        <DashboardChartOverflowMenu
          ariaLabel={cm.overflowAria}
          items={menuItems.map((it) => ({
            id: it.id,
            label: it.label,
            selected: it.selected,
            onSelect: it.onSelect,
            hidden: it.hidden,
          }))}
        />
      </div>

      <CountChart yellowCount={yellowCount} blueCount={blueCount} />

      {view === "educators" && educatorTotal === 0 ? (
        <p className="text-center text-xs text-gray-400 mt-2 px-2">
          {cm.noEducatorsInDirectory}
        </p>
      ) : null}

      <div className="flex justify-center gap-8 sm:gap-16 mt-1">
        <div className="flex flex-col gap-1 items-center text-center">
          <div className="w-5 h-5 bg-kitaSky rounded-full" />
          <span className="font-bold tabular-nums">{primaryCount}</span>
          <span className="text-xs text-gray-400">
            {firstLabel} ({pct(primaryCount, totalForView)}%)
          </span>
        </div>
        <div className="flex flex-col gap-1 items-center text-center">
          <div className="w-5 h-5 bg-kitaYellow rounded-full" />
          <span className="font-bold tabular-nums">{secondaryCount}</span>
          <span className="text-xs text-gray-400">
            {secondLabel} ({pct(secondaryCount, totalForView)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
