"use client";

import StatCardOverflowMenu from "./StatCardOverflowMenu";
import {
  formatAcademicYearLabel,
  type AcademicYearStart,
} from "@/lib/academicYear";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname } from "next/navigation";

type Entity = "admin" | "teacher" | "student" | "parent";

export default function UserCardsRowClient({
  counts,
  selectedYearStart,
}: {
  counts: Record<Entity, number>;
  selectedYearStart: AcademicYearStart;
}) {
  const dict = useTranslations();
  const pathname = usePathname();
  const langSeg = pathname.split("/").filter(Boolean)[0];
  const lang =
    langSeg === "en" || langSeg === "de" ? langSeg : DEFAULT_LOCALE;

  const yearQ = `?year=${selectedYearStart}`;
  const viewHref = (path: string) => `/${lang}${path}${yearQ}`;

  const cards: {
    key: Entity;
    viewPath: string;
  }[] = [
    { key: "admin", viewPath: "/list/admins" },
    { key: "teacher", viewPath: "/list/teachers" },
    { key: "student", viewPath: "/list/students" },
    { key: "parent", viewPath: "/list/parents" },
  ];

  const titleFor = (key: Entity) =>
    dict.entitiesPlural?.[key] ?? dict.entities?.[key] ?? key;

  const sc = dict.dashboard.statCards;

  return (
    <div className="flex gap-4 justify-between flex-wrap">
      {cards.map(({ key, viewPath }, index) => (
        <div
          key={key}
          className={`rounded-2xl p-4 flex-1 min-w-[130px] ${
            index % 2 === 0 ? "bg-kitaPurple" : "bg-kitaYellow"
          }`}
        >
          <div className="flex justify-between items-center gap-2">
            <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600 truncate max-w-[min(100%,8rem)]">
              {formatAcademicYearLabel(selectedYearStart)}
            </span>
            <StatCardOverflowMenu
              viewAllHref={viewHref(viewPath)}
              viewAllLabel={sc.viewAll}
              overflowAriaLabel={sc.overflowMenuAria}
            />
          </div>
          <h1 className="text-2xl font-semibold my-4">{counts[key]}</h1>
          <h2 className="text-sm font-medium text-gray-500">{titleFor(key)}</h2>
        </div>
      ))}
    </div>
  );
}
