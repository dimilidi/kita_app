"use client";

import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import TischspruchVote from "@/components/TischspruchVote";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n/TranslationsProvider";
import clsx from "clsx";
import { useState } from "react";

export type LunchGroupDetailData = {
  id: string;
  name: string;
  color: string | null;
  capacity: number | null;
  createdAt: string;
  children: {
    id: string;
    name: string;
    surname: string;
    img: string | null;
    className: string;
  }[];
  educators: {
    id: string;
    name: string;
    surname: string;
    img: string | null;
  }[];
  tischsprueche: { id: number; title: string; text: string }[];
  tischspruchVotes: Record<number, number>;
  /** studentId -> voted tischspruch id */
  childVoteTischspruchId: Record<string, number>;
};

const getLangFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const maybe = segments[0];
  if (maybe === "en" || maybe === "de") return maybe;
  return DEFAULT_LOCALE;
};

export default function LunchGroupDetailClient({
  data,
}: {
  data: LunchGroupDetailData;
}) {
  const dict = useTranslations();
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const listHref = `/${lang}/list/lunch-groups`;
  const boardHref = `/${lang}/list/lunch`;

  const cap = data.capacity ?? 15;
  const colorClass = data.color ?? "bg-gray-50 border-gray-300";
  const isFull = data.children.length >= cap;
  const [showTischspruch, setShowTischspruch] = useState(true);

  return (
    <div className="w-full min-w-0 flex-1 box-border px-3 py-4 md:px-6 md:py-6 max-w-[100vw]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 max-w-full">
        <Link
          href={listHref}
          className="text-sm text-kitaSky hover:underline w-fit shrink-0"
        >
          ← {dict.lunchGroups.detail.back}
        </Link>
        <Link
          href={boardHref}
          className="inline-flex items-center justify-center rounded-md bg-kitaSky px-4 py-2 text-sm font-medium text-gray-800 hover:opacity-90 shrink-0"
        >
          {dict.lunchGroups.detail.openBoard}
        </Link>
      </div>

      {/* Same visual language as lunch board {@link LunchGroup}, full width, auto height — all kids visible */}
      <div
        className={clsx(
          "relative flex w-full min-w-0 flex-col rounded-2xl border-2 border-dashed",
          "transition-colors duration-150",
          isFull ? "bg-gray-200 border-gray-400" : colorClass
        )}
      >
        <div className="shrink-0 border-b border-black/10 bg-white/30 px-4 py-4 text-center">
          <h1 className="text-lg font-semibold md:text-xl">{data.name}</h1>
          <div className="text-sm text-gray-700 tabular-nums">
            {data.children.length} / {cap}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {dict.lunchGroups.detail.created}:{" "}
            {new Date(data.createdAt).toLocaleDateString(
              lang === "de" ? "de-DE" : "en-GB",
              { dateStyle: "medium" }
            )}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 p-4 md:gap-4 md:p-6">
          <section
            className={clsx(
              "rounded-xl p-3 md:p-4",
              "bg-white/50 ring-1 ring-black/5"
            )}
          >
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-600">
              Educators
            </p>
            {data.educators.length === 0 ? (
              <p className="text-sm text-gray-600">
                {dict.lunchGroups.detail.emptyEducators}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-4 content-start justify-items-center sm:justify-items-start">
                {data.educators.map((t) => (
                  <EducatorCard
                    key={t.id}
                    id={t.id}
                    name={`${t.name} ${t.surname}`}
                    img={t.img}
                    readOnly
                  />
                ))}
              </div>
            )}
          </section>

          <section
            className={clsx(
              "rounded-xl p-3 md:p-4",
              "bg-white/50 ring-1 ring-black/5"
            )}
          >
            <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-gray-600">
              Kids
            </p>
            {data.children.length === 0 ? (
              <p className="text-sm text-gray-600">
                {dict.lunchGroups.detail.emptyChildren}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-4 gap-y-5 content-start justify-items-center sm:justify-items-start">
                {data.children.map((c) => (
                  <Child
                    key={c.id}
                    id={c.id}
                    name={`${c.name} ${c.surname}`}
                    img={c.img ?? undefined}
                    group={c.className}
                    readOnly
                    inGroup
                    voted={data.childVoteTischspruchId[c.id] != null}
                  />
                ))}
              </div>
            )}
          </section>

          {data.children.length > 0 && data.tischsprueche.length > 0 && (
            <div className="shrink-0 border-t border-black/10 pt-3">
              <button
                type="button"
                onClick={() => setShowTischspruch((v) => !v)}
                aria-expanded={showTischspruch}
                title={
                  showTischspruch
                    ? dict.lunch.hideTischspruch
                    : dict.lunch.showTischspruch
                }
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-white/60"
              >
                <span>{dict.lunch.tischspruchSection}</span>
                <span className="text-gray-500" aria-hidden>
                  {showTischspruch ? "▾" : "▸"}
                </span>
              </button>
              {showTischspruch && (
                <div className="mt-2 max-w-full overflow-x-auto">
                  <TischspruchVote
                    options={data.tischsprueche}
                    votes={data.tischspruchVotes}
                    onVote={() => {}}
                    disabled
                    hideHeading
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
