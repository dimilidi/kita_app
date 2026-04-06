"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import PlayAreaCard, { TeacherLite } from "@/components/PlayAreaCard";
import PlayPoolCard from "@/components/PlayPoolCard";
import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import { saveTeacherZones, saveZones } from "@/lib/actions";
import ZonePanel from "@/components/ZonePanel";
import { StudentWithClass } from "@/types/student";
import { Zone } from "@prisma/client";
import { useTranslations } from "@/i18n/TranslationsProvider";

type ZoneId = string;

type Props = {
  students: StudentWithClass[];
  teachers: TeacherLite[];
  zones: Zone[];
  initialZones: Record<ZoneId, string[]>;
  /** Omitted or partial when not loaded yet — pool keys default to []. */
  initialTeacherZones?: Record<ZoneId, string[]>;
};

function parseDragId(raw: string): { kind: "child" | "teacher"; id: string } | null {
  if (raw.startsWith("child:")) return { kind: "child", id: raw.slice(6) };
  if (raw.startsWith("teacher:")) return { kind: "teacher", id: raw.slice(8) };
  return null;
}

function parseDropTarget(
  overId: string
): { kind: "child" | "teacher"; zone: string } | null {
  if (overId === "pool") return { kind: "child", zone: "pool" };
  if (overId === "teacherPool") return { kind: "teacher", zone: "teacherPool" };
  if (overId.startsWith("kid-zone-")) {
    return { kind: "child", zone: overId.replace("kid-zone-", "") };
  }
  if (overId.startsWith("teacher-zone-")) {
    return { kind: "teacher", zone: overId.replace("teacher-zone-", "") };
  }
  return null;
}

export default function PlayBoard({
  students,
  teachers,
  zones,
  initialZones,
  initialTeacherZones: initialTeacherZonesProp,
}: Props) {
  const dict = useTranslations();
  const [zonesState, setZonesState] = useState<Record<string, string[]>>(() => {
    const z = initialZones ?? {};
    return {
      ...z,
      pool: z.pool ?? [],
    };
  });
  const [teacherZonesState, setTeacherZonesState] = useState<
    Record<string, string[]>
  >(() => {
    const t = initialTeacherZonesProp ?? {};
    return {
      ...t,
      teacherPool: t.teacherPool ?? [],
    };
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

  const zoneMap = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z])),
    [zones]
  );

  const getStudent = (id: string) => students.find((s) => s.id === id);
  const getTeacher = (id: string) => teachers.find((t) => t.id === id);

  const activeParsed = activeId ? parseDragId(activeId) : null;
  const activeStudent =
    activeParsed?.kind === "child" ? getStudent(activeParsed.id) : null;
  const activeTeacher =
    activeParsed?.kind === "teacher" ? getTeacher(activeParsed.id) : null;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const parsed = parseDragId(String(active.id));
    const target = parseDropTarget(String(over.id));
    if (!parsed || !target) return;
    if (parsed.kind !== target.kind) return;

    const entityId = parsed.id;
    const toZone = target.zone;

    if (parsed.kind === "child") {
      setZonesState((prev) => {
        const from = Object.keys(prev).find((z) =>
          prev[z].includes(entityId)
        );
        if (!from || from === toZone) return prev;

        const max =
          toZone !== "pool" ? zoneMap[toZone]?.capacity ?? undefined : undefined;
        if (toZone !== "pool" && max && (prev[toZone]?.length ?? 0) >= max) {
          return prev;
        }

        const next: Record<string, string[]> = {
          ...prev,
          [from]: prev[from].filter((c) => c !== entityId),
          [toZone]: [...(prev[toZone] ?? []), entityId],
        };
        void saveZones(next);
        return next;
      });
    } else {
      setTeacherZonesState((prev) => {
        const from = Object.keys(prev).find((z) =>
          prev[z].includes(entityId)
        );
        if (!from || from === toZone) return prev;

        const next: Record<string, string[]> = {
          ...prev,
          [from]: prev[from].filter((t) => t !== entityId),
          [toZone]: [...(prev[toZone] ?? []), entityId],
        };
        void saveTeacherZones(next);
        return next;
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="max-w-[100vw] mx-auto p-4 md:p-6 space-y-6">
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex flex-nowrap gap-4 items-stretch">
            {zones.map((zone) => (
              <PlayAreaCard
                key={zone.id}
                zone={zone}
                childrenIds={zonesState[zone.id] ?? []}
                educatorIds={teacherZonesState[zone.id] ?? []}
                getStudent={getStudent}
                getTeacher={getTeacher}
                onOpen={setOpenZone}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 border-t border-gray-200 pt-6">
          <PlayPoolCard
            droppableId="pool"
            title={dict.playBoard.kidsPool}
            variant="kids"
            ids={zonesState.pool ?? []}
            getStudent={getStudent}
            getTeacher={getTeacher}
          />
          <PlayPoolCard
            droppableId="teacherPool"
            title={dict.playBoard.educatorsPool}
            variant="teachers"
            ids={teacherZonesState.teacherPool ?? []}
            getStudent={getStudent}
            getTeacher={getTeacher}
          />
        </div>
      </div>

      {openZone && (
        <ZonePanel
          title={zoneMap[openZone]?.name ?? ""}
          childrenIds={zonesState[openZone] ?? []}
          educatorIds={teacherZonesState[openZone] ?? []}
          getStudent={getStudent}
          getTeacher={getTeacher}
          onClose={() => setOpenZone(null)}
        />
      )}

      <DragOverlay>
        {activeStudent ? (
          <Child
            id={activeStudent.id}
            dragId={`child:${activeStudent.id}`}
            name={`${activeStudent.name} ${activeStudent.surname}`}
            img={activeStudent.img ?? undefined}
            group={activeStudent.class.name}
          />
        ) : activeTeacher ? (
          <EducatorCard
            id={activeTeacher.id}
            name={`${activeTeacher.name} ${activeTeacher.surname}`}
            img={activeTeacher.img}
            readOnly
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
