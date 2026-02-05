"use client";

import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import Child from "./Child";
import TischspruchVote from "./TischspruchVote";

export default function LunchGroup({
  id,
  title,
  color,
  childrenIds,
  votes,
  votedChildren,
  onVote,
  maxPerGroup,
  onSelectChild
}: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isFull = childrenIds.length >= maxPerGroup;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "relative flex flex-col gap-3 rounded-2xl p-4 w-[360px]",
        "border-2 border-dashed transition-all duration-150",
        isFull
        ? "bg-gray-200 border-gray-400"
        : color,
        isOver && "ring-4 ring-kitaSky bg-blue-50"
      )}
    >
      <h3 className="text-center font-semibold">
        {title}
        <div className="text-xs text-gray-600">
          {childrenIds.length} / {maxPerGroup}
        </div>
      </h3>

      <div className="grid grid-cols-5 gap-2">
        {childrenIds.map((child: string) => (
          <Child
            key={child}
            id={child}
            voted={votedChildren.includes(child)}
            inGroup
            onSelect={onSelectChild}
          />
        ))}
      </div>

      {childrenIds.length > 0 && (
        <TischspruchVote
          votes={votes}
          onVote={onVote}
          disabled={votedChildren.length === childrenIds.length}
        />
      )}
    </div>
  );
}
