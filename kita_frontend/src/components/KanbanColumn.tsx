"use client";

import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import Child from "./Child";

type Props = {
  id: string;
  title: string;
  color: string;
  childrenIds: string[];
  max?: number;
  onSelectChild?: (id: string) => void;
};

export default function KanbanColumn({
  id,
  title,
  color,
  childrenIds,
  max,
  onSelectChild,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isFull = max ? childrenIds.length >= max : false;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex flex-col gap-3 rounded-2xl p-4  max-w-[1200px] mx-auto overflow-y-auto",
        "border-2 border-dashed transition-all",
        color,
        isOver && "ring-4 ring-blue-300",
        isFull && "opacity-50"
      )}
    >
      <h3 className="text-center font-semibold">
        {title}
        {max && (
          <div className="text-xs text-gray-600">
            {childrenIds.length} / {max}
          </div>
        )}
      </h3>

      <div className="grid grid-cols-10 gap-4">
        {childrenIds.map((child) => (
          <Child
            key={child}
            id={child}
            inGroup
            onSelect={onSelectChild}
          />
        ))}
      </div>
    </div>
  );
}
