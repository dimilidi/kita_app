"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import Child from "@/components/Child";
import LunchGroup from "@/components/LunchGroup";

const MAX_PER_GROUP = 15;

type GroupId = "green" | "yellow" | "red" | "pool";
type VoteKey = "danke" | "piep" | "apfel";

export default function LunchBoard() {
  const [groups, setGroups] = useState<Record<GroupId, string[]>>({
    green: [],
    yellow: [],
    red: [],
    pool: Array.from({ length: 45 }, (_, i) => `Kid ${i + 1}`),
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const [activeChildForVote, setActiveChildForVote] =
    useState<string | null>(null);

  const [childVotes, setChildVotes] = useState<
    Record<string, VoteKey | null>
  >({});

  const poolDroppable = useDroppable({ id: "pool" });

  //  LONG PRESS DRAG
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400,     
        tolerance: 5,   
      },
    })
  );

  const getVotesForGroup = (groupId: Exclude<GroupId, "pool">) => {
    const result: Record<VoteKey, number> = {
      danke: 0,
      piep: 0,
      apfel: 0,
    };

    groups[groupId].forEach((child) => {
      const vote = childVotes[child];
      if (vote) result[vote]++;
    });

    return result;
  };

  return (
    <DndContext
      sensors={sensors}
      autoScroll
      onDragStart={({ active }) => {
        setActiveId(active.id as string);
      }}
      onDragEnd={({ active, over }) => {
        setActiveId(null);
        if (!over) return;

        setGroups((prev) => {
          const from = (Object.keys(prev) as GroupId[]).find((g) =>
            prev[g].includes(active.id as string)
          );

          const to = over.id as GroupId;

          if (!from || from === to) return prev;
          if (to !== "pool" && prev[to].length >= MAX_PER_GROUP) {
            return prev;
          }

          return {
            ...prev,
            [from]: prev[from].filter((c) => c !== active.id),
            [to]: [...prev[to], active.id as string],
          };
        });
      }}
    >
      <div className="flex flex-col gap-6">
        {/* GROUPS */}
        <div className="flex justify-center gap-6">
          {(["green", "yellow", "red"] as const).map((id) => (
            <LunchGroup
              key={id}
              id={id}
              title={
                id === "green"
                  ? "🟢 Green Group"
                  : id === "yellow"
                  ? "🟡 Yellow Group"
                  : "🔴 Red Group"
              }
              color={
                id === "green"
                  ? "bg-green-50 border-green-300"
                  : id === "yellow"
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-red-50 border-red-300"
              }
              childrenIds={groups[id]}
              votes={getVotesForGroup(id)}
              votedChildren={groups[id].filter(
                (c) => childVotes[c] != null
              )}
              maxPerGroup={MAX_PER_GROUP}
              onSelectChild={setActiveChildForVote}
              onVote={(key: VoteKey) => {
                if (!activeChildForVote) return;

                setChildVotes((prev) => ({
                  ...prev,
                  [activeChildForVote]: key,
                }));

                setActiveChildForVote(null);
              }}
            />
          ))}
        </div>

        {/* POOL */}
       <div
          ref={poolDroppable.setNodeRef}
          className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 h-[450px] overflow-y-auto"
        >
          <h3 className="mb-3 text-center font-semibold sticky top-0 bg-gray-50 z-10">
            All kids
          </h3>

          <div className="grid grid-cols-8 gap-4">
            {groups.pool.map((child) => (
              <Child key={child} id={child} />
            ))}
          </div>
        </div>

      </div>

      {/* DRAG PREVIEW */}
      <DragOverlay>
        {activeId ? <Child id={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
