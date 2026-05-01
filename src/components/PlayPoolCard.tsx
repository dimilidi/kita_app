"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import type { TeacherLite } from "@/components/PlayAreaCard";
import { StudentWithClass } from "@/types/student";

type Props = {
  droppableId: string;
  title: string;
  variant: "kids" | "teachers";
  ids: string[];
  getStudent: (id: string) => StudentWithClass | undefined;
  getTeacher: (id: string) => TeacherLite | undefined;
  /** Optional handle (e.g. section reorder) — rendered before the title */
  dragHandle?: ReactNode;
  /** When true, pool does not accept drags (section reorder drag active) */
  suspendDroppables?: boolean;
  /** Lunch board: fill resizable section; scroll areas grow with section height */
  fillSectionHeight?: boolean;
  lunchNowByStudentId?: Record<string, boolean>;
  lunchNowLabel?: string;
};

export default function PlayPoolCard({
  droppableId,
  title,
  variant,
  ids,
  getStudent,
  getTeacher,
  dragHandle,
  suspendDroppables = false,
  fillSectionHeight = false,
  lunchNowByStudentId = {},
  lunchNowLabel,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    disabled: suspendDroppables,
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "rounded-xl border border-gray-200 bg-gray-50/80 shadow-sm p-3 transition-colors",
        fillSectionHeight
          ? "flex h-full min-h-0 w-full flex-col"
          : "flex-1",
        variant === "kids" && !fillSectionHeight
          ? "min-w-[300px] w-full max-w-full"
          : "min-w-0",
        isOver && "ring-2 ring-kitaSky"
      )}
    >
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 min-w-0 shrink-0">
        {dragHandle}
        <span className="min-w-0">{title}</span>
      </h2>
      <div
        className={clsx(
          variant === "kids"
            ? fillSectionHeight
              ? "flex-1 min-h-0 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3 content-start items-start"
              : "max-h-[200px] min-h-[96px] overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 content-start items-start"
            : fillSectionHeight
              ? "min-h-[140px] flex-1 min-h-0 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 content-start"
              : "min-h-[140px] grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 content-start"
        )}
      >
        {variant === "kids"
          ? ids.map((sid) => {
              const s = getStudent(sid);
              if (!s) return null;
              return (
                <Child
                  key={sid}
                  id={s.id}
                  dragId={`child:${s.id}`}
                  name={`${s.name} ${s.surname}`}
                  img={s.img ?? undefined}
                  group={s.class.name}
                  lunchNow={!!lunchNowByStudentId[s.id]}
                  lunchNowLabel={lunchNowLabel}
                />
              );
            })
          : ids.map((tid) => {
              const t = getTeacher(tid);
              if (!t) return null;
              return (
                <EducatorCard
                  key={tid}
                  id={t.id}
                  name={`${t.name} ${t.surname}`}
                  img={t.img}
                  subtitle={t.subtitle}
                  readOnly={t.readOnly}
                />
              );
            })}
      </div>
    </div>
  );
}
