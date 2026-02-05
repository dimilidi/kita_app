"use client";

import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";

type ChildProps = {
  id: string;
  voted?: boolean;
  inGroup?: boolean;
  onSelect?: (id: string) => void;
};

export default function Child({
  id,
  voted = false,
  inGroup = false,
  onSelect,
}: ChildProps) {
  const { setNodeRef, listeners, attributes, transform, isDragging } =
    useDraggable({ id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => inGroup && onSelect?.(id)}
      className={clsx(
        "flex flex-col items-center gap-1 select-none cursor-pointer",
        isDragging && "opacity-60"
      )}
    >
      <div
        className={clsx(
          "h-12 w-12 rounded-full flex items-center justify-center text-lg shadow bg-amber-300",
          inGroup &&
            (voted
              ? "ring-4 ring-green-500"
              : "ring-4 ring-red-500")
        )}
      >
        👧
      </div>

      <span className="text-xs font-medium text-center">{id}</span>
    </div>
  );
}
