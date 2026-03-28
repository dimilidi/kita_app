"use client";

import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { useState } from "react";
import Link from "next/link";
import Child from "./Child";
import EducatorCard from "./EducatorCard";
import type { TeacherLite } from "./PlayAreaCard";
import TischspruchVote from "./TischspruchVote";
import { useTranslations } from "@/i18n/TranslationsProvider";

type LunchGroupProps = {
  id: string;
  title: string;
  color: string;
  educatorIds: string[];
  childrenIds: string[];
  voteOptions: { id: number; title: string; text: string }[];
  votes: Record<number, number>;
  votedChildren: string[];
  onVote: (id: number) => void;
  maxPerGroup: number;
  onSelectChild: (id: string) => void;
  getChild: (id: string) =>
    | { id: string; name: string; img?: string; group?: string }
    | undefined;
  getTeacher: (id: string) => TeacherLite | undefined;
  detailHref?: string;
};

export default function LunchGroup({
  id,
  title,
  color,
  educatorIds,
  childrenIds,
  voteOptions,
  votes,
  votedChildren,
  onVote,
  maxPerGroup,
  onSelectChild,
  getChild,
  getTeacher,
  detailHref,
}: LunchGroupProps) {
  const dict = useTranslations();
  const [showTischspruch, setShowTischspruch] = useState(true);
  const kidDrop = useDroppable({ id: `kid-lunch-${id}` });
  const teacherDrop = useDroppable({ id: `teacher-lunch-${id}` });
  const isOverZone = kidDrop.isOver || teacherDrop.isOver;
  const isFull = childrenIds.length >= maxPerGroup;

  return (
    <div
      className={clsx(
        "relative flex flex-col min-w-0 w-full h-[480px] rounded-2xl overflow-hidden",
        "border-2 border-dashed transition-all duration-150",
        isFull ? "bg-gray-200 border-gray-400" : color,
        isOverZone && "ring-4 ring-kitaSky bg-blue-50"
      )}
    >
      <h3 className="shrink-0 text-center font-semibold px-2 pt-3 pb-2">
        {detailHref ? (
          <Link
            href={detailHref}
            className="text-gray-900 no-underline opacity-100 transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 rounded-sm"
            title={dict.lunchGroups.detail.viewDetail}
          >
            {title}
          </Link>
        ) : (
          title
        )}
        <div className="text-xs text-gray-600">
          {childrenIds.length} / {maxPerGroup}
        </div>
      </h3>

      <div className="flex flex-1 flex-col min-h-0 px-3 pb-2 gap-2">
        <div
          ref={teacherDrop.setNodeRef}
          className={clsx(
            "shrink-0 rounded-lg p-2 max-h-[130px] min-h-[56px] overflow-y-auto transition-colors",
            teacherDrop.isOver && "ring-2 ring-amber-400 ring-inset bg-white/60"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1.5">
            Educators
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3 content-start">
            {educatorIds.map((tid) => {
              const t = getTeacher(tid);
              if (!t) return null;
              return (
                <EducatorCard
                  key={tid}
                  id={t.id}
                  name={`${t.name} ${t.surname}`}
                  img={t.img}
                />
              );
            })}
          </div>
        </div>

        <div
          ref={kidDrop.setNodeRef}
          className={clsx(
            "flex min-h-0 flex-1 flex-col rounded-lg p-2 overflow-y-auto transition-colors",
            kidDrop.isOver && "ring-2 ring-blue-400 ring-inset bg-white/60"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1.5 shrink-0">
            Kids
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3 content-start">
            {childrenIds.map((child: string) => {
              const childData = getChild(child);
              if (!childData) return null;

              return (
                <Child
                  key={child}
                  id={childData.id}
                  dragId={`child:${childData.id}`}
                  name={childData.name}
                  img={childData.img}
                  group={childData.group}
                  voted={votedChildren.includes(child)}
                  inGroup
                  onSelect={onSelectChild}
                />
              );
            })}
          </div>
        </div>

        {childrenIds.length > 0 && (
          <div className="shrink-0 flex flex-col gap-1 border-t border-black/10 pt-2 mt-1">
            <button
              type="button"
              onClick={() => setShowTischspruch((v) => !v)}
              aria-expanded={showTischspruch}
              title={
                showTischspruch
                  ? dict.lunch.hideTischspruch
                  : dict.lunch.showTischspruch
              }
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-white/60 transition-colors"
            >
              <span>{dict.lunch.tischspruchSection}</span>
              <span className="tabular-nums text-gray-500" aria-hidden>
                {showTischspruch ? "▾" : "▸"}
              </span>
            </button>
            {showTischspruch && (
              <div className="max-h-[112px] overflow-y-auto">
                <TischspruchVote
                  options={voteOptions}
                  votes={votes}
                  onVote={onVote}
                  disabled={
                    voteOptions.length === 0 ||
                    votedChildren.length === childrenIds.length
                  }
                  hideHeading
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
