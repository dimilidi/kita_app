"use client";

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
};

export default function PlayPoolCard({
  droppableId,
  title,
  variant,
  ids,
  getStudent,
  getTeacher,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 rounded-xl border border-gray-200 bg-gray-50/80 shadow-sm p-3 transition-colors ${
        isOver ? "ring-2 ring-kitaSky" : ""
      }`}
    >
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="min-h-[140px] grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 content-start">
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
                />
              );
            })}
      </div>
    </div>
  );
}
