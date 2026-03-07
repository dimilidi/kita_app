"use client";

import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";

type ChildProps = {
  id: string;
  name?: string;
  img?: string;
  group?: string;
  voted?: boolean;
  inGroup?: boolean;
  onSelect?: (id: string) => void;
};

export default function Child({
  id,
  name,
  img,
  group,
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
        "flex flex-col items-center justify-center w-[80px] p-2 rounded-lg bg-white shadow-sm border text-center cursor-pointer select-none transition",
        "hover:shadow-md",
        isDragging && "opacity-50 scale-105",
        inGroup &&
          (voted
            ? "ring-2 ring-green-500"
            : "ring-2 ring-red-500")
      )}
    >
      {/* Avatar */}
      <img
        src={img || "/noAvatar.png"}
        alt={name}
        className="w-12 h-12 rounded-full object-cover"
      />

      {/* Name */}
      <span className="text-xs font-semibold leading-tight mt-1">
        {name}
      </span>

      {/* Group badge */}
      {group && (
        <span className="text-[10px] text-gray-500">
          {group}
        </span>
      )}
    </div>
  );
}