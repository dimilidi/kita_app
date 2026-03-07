"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import KanbanColumn from "@/components/KanbanColumn";
import { StudentWithClass } from "@/types/student";
import Child from "@/components/Child";
import { saveZones } from "@/lib/actions";
import ZonePanel from "@/components/ZonePanel";
import { Zone } from "@prisma/client";

type ZoneId = string;

type Props = {
  students: StudentWithClass[];
  zones: Zone[];
  initialZones: Record<ZoneId, string[]>;
};

export default function PlayBoard({ students, zones, initialZones }: Props) {
  const [zonesState, setZones] = useState<Record<string, string[]>>({
    pool: [],
    ...initialZones,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openZone, setOpenZone] = useState<ZoneId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 5,
      },
    })
  );

  // map zones by id for quick lookup
  const zoneMap = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z])),
    [zones]
  );

  const getStudent = (id: string) => students.find((s) => s.id === id);
  const activeStudent = activeId ? getStudent(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => {
        setActiveId(active.id as string);
      }}
      onDragEnd={({ active, over }) => {
        setActiveId(null);
        if (!over) return;

        setZones((prev) => {
          const from = Object.keys(prev).find((z) =>
            prev[z].includes(active.id as string)
          );

          const to = over.id as ZoneId;

          if (!from || from === to) return prev;

          const max = zoneMap[to]?.capacity;

          if (max && prev[to]?.length >= max) return prev;

          const newZones = {
            ...prev,
            [from]: prev[from].filter((c) => c !== active.id),
            [to]: [...(prev[to] ?? []), active.id as string],
          };

          // save to DB
          void saveZones(newZones);

          return newZones;
        });
      }}
    >
      <div className="max-w-screen-xl mx-auto p-6 space-y-8">

        {/* ZONES */}
        <div className="grid grid-cols-4 gap-6">
          {zones.map((zone) => (
            <KanbanColumn
              key={zone.id}
              id={zone.id}
              title={`${zone.icon ?? ""} ${zone.name}`}
              color="bg-blue-50 border-blue-300"
              childrenIds={zonesState[zone.id] ?? []}
              getStudent={getStudent}
              max={zone.capacity ?? undefined}
              onOpen={setOpenZone}
            />
          ))}
        </div>

        {/* POOL */}
        <div className="border-t pt-6">
          <KanbanColumn
            id="pool"
            title="👶 All kids"
            color="bg-gray-50 border-gray-300"
            childrenIds={zonesState.pool ?? []}
            getStudent={getStudent}
          />
        </div>
      </div>

      {/* Zone detail panel */}
      {openZone && (
        <ZonePanel
          zoneId={openZone}
          title={`${zoneMap[openZone]?.icon ?? ""} ${zoneMap[openZone]?.name}`}
          childrenIds={zonesState[openZone] ?? []}
          getStudent={getStudent}
          onClose={() => setOpenZone(null)}
        />
      )}

      {/* Drag preview */}
      <DragOverlay>
        {activeStudent ? (
          <Child
            id={activeStudent.id}
            name={`${activeStudent.name} ${activeStudent.surname}`}
            img={activeStudent.img ?? undefined}
            group={activeStudent.class.name}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}