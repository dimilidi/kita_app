"use client";

import { useDroppable } from "@dnd-kit/core";
import Child from "@/components/Child";
import { StudentWithClass } from "@/types/student";

type Props = {
  id: string;
  title: string;
  color: string;
  childrenIds: string[];
  getStudent: (id: string) => StudentWithClass | undefined;
  max?: number;
  onOpen?: (id: string) => void;
};

function getZoneStatusColor(count: number, max?: number) {
  if (!max) return "bg-blue-50 border-blue-300";

  const ratio = count / max;

  if (ratio >= 1) return "bg-red-50 border-red-400";
  if (ratio >= 0.8) return "bg-yellow-50 border-yellow-400";
  return "bg-green-50 border-green-400";
}

export default function KanbanColumn({
  id,
  title,
  color,
  childrenIds,
  getStudent,
  max,
  onOpen
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const zoneColor = getZoneStatusColor(childrenIds.length, max);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border shadow-sm transition-colors ${zoneColor} ${
      isOver ? "ring-2 ring-blue-400" : ""
      }`}
    >
      {/* HEADER */}
      <div
        onClick={() => onOpen?.(id)}
        className="flex items-center justify-between px-3 py-2 border-b font-semibold text-sm cursor-pointer hover:bg-black/5"
      >
          <div className="flex items-center justify-between px-3 py-2 border-b font-semibold text-sm">
            <span>{title}</span>

            <div className="text-xs font-semibold">
              {childrenIds.length}
              {max && <span className="text-gray-500"> / {max}</span>}
            </div>
          </div>
      </div>

      {/* CHILDREN LIST */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2 p-3 min-h-[420px] content-start">
        {childrenIds.map((id) => {
          const student = getStudent(id);
          if (!student) return null;

          return (
            <Child
              key={id}
              id={student.id}
              name={student.name}
              img={student.img ?? undefined}
              group={`${student.class.name}`}
            />
          );
        })}
      </div>
    </div>
  );
}