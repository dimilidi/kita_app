"use client";

import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";

type ChildProps = {
  id: string;
  /** Defaults to `id`. Use `child:${id}` on the play board to avoid id clashes with educators. */
  dragId?: string;
  name?: string;
  img?: string;
  group?: string;
  /** Visual only: child’s scheduled lunch slot is active (does not move them). */
  lunchNow?: boolean;
  lunchNowLabel?: string;
  voted?: boolean;
  inGroup?: boolean;
  onSelect?: (id: string) => void;
  /** Static display (e.g. lunch group detail page) — no drag. */
  readOnly?: boolean;
};

export default function Child({
  id,
  dragId,
  name,
  img,
  group,
  lunchNow = false,
  lunchNowLabel,
  voted = false,
  inGroup = false,
  onSelect,
  readOnly,
}: ChildProps) {
  const { setNodeRef, listeners, attributes, transform, isDragging } =
    useDraggable({ id: dragId ?? id, disabled: readOnly });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        touchAction: "none",
      }
    : readOnly
      ? undefined
      : { touchAction: "none" as const };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(readOnly ? {} : listeners)}
      {...(readOnly ? {} : attributes)}
      onClick={() => !readOnly && inGroup && onSelect?.(id)}
      className={clsx(
        "flex flex-col items-center justify-center w-[80px] p-2 rounded-lg bg-white shadow-sm border text-center select-none transition",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing touch-none",
        !readOnly && "hover:shadow-md",
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
        draggable={false}
        className="w-12 h-12 rounded-full object-cover pointer-events-none"
      />

      {/* Name */}
      <span className="text-xs font-semibold leading-tight mt-1">
        {name}
      </span>

      {lunchNow && lunchNowLabel ? (
        <span className="mt-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-amber-950">
          {lunchNowLabel}
        </span>
      ) : null}

      {/* Group badge */}
      {group && (
        <span className="text-[10px] text-gray-500">
          {group}
        </span>
      )}
    </div>
  );
}