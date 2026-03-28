"use client";

import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";

export type EducatorCardProps = {
  id: string;
  name: string;
  img?: string | null;
  subtitle?: string;
  /** Non-draggable copy (e.g. zone detail modal). */
  readOnly?: boolean;
};

/** Draggable educator chip — same visual language as {@link Child}. */
export default function EducatorCard({
  id,
  name,
  img,
  subtitle,
  readOnly,
}: EducatorCardProps) {
  const { setNodeRef, listeners, attributes, transform, isDragging } =
    useDraggable({ id: `teacher:${id}`, disabled: readOnly });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const body = (
    <>
      <img
        src={img || "/noAvatar.png"}
        alt=""
        className="w-12 h-12 rounded-full object-cover"
      />
      <span className="text-xs font-semibold leading-tight mt-1">{name}</span>
      {subtitle ? (
        <span className="text-[10px] text-gray-500">{subtitle}</span>
      ) : null}
    </>
  );

  if (readOnly) {
    return (
      <div className="flex flex-col items-center justify-center w-[80px] p-2 rounded-lg bg-white shadow-sm border border-amber-200/80 text-center">
        {body}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "flex flex-col items-center justify-center w-[80px] p-2 rounded-lg bg-white shadow-sm border text-center cursor-grab active:cursor-grabbing select-none transition",
        "hover:shadow-md border-amber-200/80",
        isDragging && "opacity-50 scale-105"
      )}
    >
      {body}
    </div>
  );
}
