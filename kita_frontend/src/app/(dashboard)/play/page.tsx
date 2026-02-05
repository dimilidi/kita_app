"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import Child from "@/components/Child";
import KanbanColumn from "@/components/KanbanColumn";

type ZoneId =
  | "toilet"
  | "hall"
  | "outside"
  | "restaurant"
  | "bauwelt"
  | "abenteuerland"
  | "kreativwerkstatt"
  | "pool";

const ZONES: Record<Exclude<ZoneId, "pool">, string> = {
  toilet: "🚽 Тоалетна",
  hall: "🏃 Салон",
  outside: "🌳 Навън",
  restaurant: "🍽️ Детски ресторант",
  bauwelt: "🧱 Bauwelt",
  abenteuerland: "🏴‍☠️ Abenteuerland",
  kreativwerkstatt: "🎨 Kreativwerkstatt",
};

export default function PlayBoard() {
  const [zones, setZones] = useState<Record<ZoneId, string[]>>({
    toilet: [],
    hall: [],
    outside: [],
    restaurant: [],
    bauwelt: [],
    abenteuerland: [],
    kreativwerkstatt: [],
    pool: Array.from({ length: 45 }, (_, i) => `Kid ${i + 1}`),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 5,
      },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (!over) return;

        setZones((prev) => {
          const from = (Object.keys(prev) as ZoneId[]).find((z) =>
            prev[z].includes(active.id as string)
          );
          const to = over.id as ZoneId;

          if (!from || from === to) return prev;

          return {
            ...prev,
            [from]: prev[from].filter((c) => c !== active.id),
            [to]: [...prev[to], active.id as string],
          };
        });
      }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap justify-center gap-6">
          {(Object.keys(ZONES) as (keyof typeof ZONES)[]).map((id) => (
            <KanbanColumn
              key={id}
              id={id}
              title={ZONES[id]}
              color="bg-blue-50 border-blue-300"
              childrenIds={zones[id]}
            />
          ))}
        </div>

        {/* POOL */}
        <KanbanColumn
          id="pool"
          title="👶 All kids"
          color="bg-gray-50 border-gray-300"
          childrenIds={zones.pool}
        />
      </div>
    </DndContext>
  );
}
