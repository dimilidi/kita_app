"use client";

import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { forwardRef, useState, type ReactNode } from "react";
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
  /** Board layout: section reorder handle (listeners only on this control) */
  dragHandle?: ReactNode;
  /** When true, group zones do not accept drags (section reorder drag active) */
  suspendDroppables?: boolean;
  /** Lunch board: fill resizable section height instead of fixed 480px */
  fillSectionHeight?: boolean;
};

type LunchCollapsibleProps = {
  open: boolean;
  onToggle: () => void;
  label: ReactNode;
  buttonTitle?: string;
  children: ReactNode;
  className?: string;
};

const LunchCollapsible = forwardRef<HTMLDivElement, LunchCollapsibleProps>(
  ({ open, onToggle, label, buttonTitle, children, className }, ref) => (
    <div ref={ref} className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={buttonTitle}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-white/60 transition-colors shrink-0"
      >
        <span>{label}</span>
        <span className="tabular-nums text-gray-500" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && children}
    </div>
  )
);
LunchCollapsible.displayName = "LunchCollapsible";

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
  dragHandle,
  suspendDroppables = false,
  fillSectionHeight = false,
}: LunchGroupProps) {
  const dict = useTranslations();
  const [isKidsOpen, setIsKidsOpen] = useState(true);
  const [isEducatorsOpen, setIsEducatorsOpen] = useState(false);
  const [showTischspruch, setShowTischspruch] = useState(true);
  const kidDrop = useDroppable({
    id: `kid-lunch-${id}`,
    disabled: suspendDroppables,
  });
  const teacherDrop = useDroppable({
    id: `teacher-lunch-${id}`,
    disabled: suspendDroppables,
  });
  const isOverZone = kidDrop.isOver || teacherDrop.isOver;
  const isFull = childrenIds.length >= maxPerGroup;

  return (
    <div
      className={clsx(
        "relative flex flex-col min-w-0 w-full rounded-2xl overflow-hidden",
        fillSectionHeight ? "h-full min-h-[240px]" : "h-[480px]",
        "border-2 border-dashed transition-all duration-150",
        isFull ? "bg-gray-200 border-gray-400" : color,
        isOverZone && "ring-4 ring-kitaSky bg-blue-50"
      )}
    >
      <div className="shrink-0 flex items-start gap-2 px-2 pt-3 pb-2 w-full min-w-0">
        {dragHandle ? (
          <div className="shrink-0 pt-0.5">{dragHandle}</div>
        ) : null}
        <h3 className="flex-1 min-w-0 text-center font-semibold">
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
          <div className="text-xs text-gray-600 font-normal">
            {childrenIds.length} / {maxPerGroup}
          </div>
        </h3>
      </div>

      <div className="flex flex-1 flex-col min-h-0 px-3 pb-2 gap-2">
        <LunchCollapsible
          ref={teacherDrop.setNodeRef}
          open={isEducatorsOpen}
          onToggle={() => setIsEducatorsOpen((v) => !v)}
          label={dict.lunchGroups.detail.assignedEducators}
          className={clsx(
            "shrink-0 flex flex-col gap-1 rounded-lg px-3 py-3 transition-colors",
            /* Cap when expanded so kids/tischspruch keep space; inner area reserves ≥1 card height */
            isEducatorsOpen && "max-h-[min(320px,44vh)]",
            teacherDrop.isOver && "ring-2 ring-amber-400 ring-inset bg-white/60"
          )}
        >
          <div className="min-h-[116px] max-h-[min(220px,34vh)] overflow-y-auto overscroll-contain py-2 px-2">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-4 content-start">
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
        </LunchCollapsible>

        <LunchCollapsible
          ref={kidDrop.setNodeRef}
          open={isKidsOpen}
          onToggle={() => setIsKidsOpen((v) => !v)}
          label="Kids"
          className={clsx(
            "flex min-h-0 flex-1 flex-col rounded-lg px-3 py-3 min-h-[140px] transition-colors",
            kidDrop.isOver && "ring-2 ring-blue-400 ring-inset bg-white/60"
          )}
        >
          <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-4 content-start">
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
        </LunchCollapsible>

        {childrenIds.length > 0 && (
          <LunchCollapsible
            open={showTischspruch}
            onToggle={() => setShowTischspruch((v) => !v)}
            label={dict.lunch.tischspruchSection}
            buttonTitle={
              showTischspruch
                ? dict.lunch.hideTischspruch
                : dict.lunch.showTischspruch
            }
            className="shrink-0 flex flex-col gap-1 border-t border-black/10 pt-2 mt-1"
          >
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
          </LunchCollapsible>
        )}
      </div>
    </div>
  );
}
