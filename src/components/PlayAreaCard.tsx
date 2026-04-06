"use client";

import { useDroppable } from "@dnd-kit/core";
import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import { StudentWithClass } from "@/types/student";

export type TeacherLite = {
  id: string;
  name: string;
  surname: string;
  img?: string | null;
};

type ZoneLike = {
  id: string;
  name: string;
  capacity: number | null;
};

type Props = {
  zone: ZoneLike;
  childrenIds: string[];
  educatorIds: string[];
  getStudent: (id: string) => StudentWithClass | undefined;
  getTeacher: (id: string) => TeacherLite | undefined;
  onOpen?: (zoneId: string) => void;
};

function getZoneStatusColor(count: number, max?: number) {
  if (!max) return "bg-blue-50 border-blue-300";
  const ratio = count / max;
  if (ratio >= 1) return "bg-red-50 border-red-400";
  if (ratio >= 0.8) return "bg-yellow-50 border-yellow-400";
  return "bg-green-50 border-green-300";
}

export default function PlayAreaCard({
  zone,
  childrenIds,
  educatorIds,
  getStudent,
  getTeacher,
  onOpen,
}: Props) {
  const kidDrop = useDroppable({ id: `kid-zone-${zone.id}` });
  const teacherDrop = useDroppable({ id: `teacher-zone-${zone.id}` });

  const zoneColor = getZoneStatusColor(childrenIds.length, zone.capacity ?? undefined);

  return (
    <div
      className={`flex flex-col rounded-xl border shadow-sm transition-colors flex-shrink-0 w-[280px] h-[420px] ${zoneColor}`}
    >
      <button
        type="button"
        onClick={() => onOpen?.(zone.id)}
        className="flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 border-b border-black/5 text-left w-full hover:bg-black/5 rounded-t-xl"
      >
        <span className="font-semibold text-sm truncate">{zone.name}</span>
        <span className="text-xs font-semibold tabular-nums shrink-0">
          {childrenIds.length}
          {zone.capacity != null && (
            <span className="text-gray-500"> / {zone.capacity}</span>
          )}
        </span>
      </button>

      <div className="flex flex-1 flex-col min-h-0 gap-2 p-3">
        {/* Educators first (fixed band + scroll if many) */}
        <div
          ref={teacherDrop.setNodeRef}
          className={`flex shrink-0 flex-col rounded-lg p-2 max-h-[140px] min-h-[72px] overflow-y-auto transition-colors ${
            teacherDrop.isOver ? "ring-2 ring-amber-400 ring-inset bg-white/60" : ""
          }`}
        >
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 shrink-0">
            Educators
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 content-start">
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

        {/* Kids fill remaining height and scroll */}
        <div
          ref={kidDrop.setNodeRef}
          className={`flex min-h-0 flex-1 flex-col rounded-lg p-2 overflow-y-auto transition-colors ${
            kidDrop.isOver ? "ring-2 ring-blue-400 ring-inset bg-white/60" : ""
          }`}
        >
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 shrink-0">
            Kids
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 content-start">
            {childrenIds.map((sid) => {
              const student = getStudent(sid);
              if (!student) return null;
              return (
                <Child
                  key={sid}
                  id={student.id}
                  dragId={`child:${student.id}`}
                  name={`${student.name} ${student.surname}`}
                  img={student.img ?? undefined}
                  group={student.class.name}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
