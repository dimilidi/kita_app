"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { saveLunchGroups, saveLunchVote } from "@/lib/actions";
import Child from "@/components/Child";
import LunchGroup from "@/components/LunchGroup";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n/TranslationsProvider";

type GroupId = string;

type LunchStudent = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  className: string;
};

type Tischspruch = {
  id: number;
  title: string;
  text: string;
};

type Props = {
  students: LunchStudent[];
  initialGroups: Record<GroupId, string[]>;
  lunchGroups: { id: string; name: string; color?: string; capacity: number }[];
  initialVotes: Record<string, number>;
  initialTischsprueche: Tischspruch[];
  canManageTischsprueche: boolean;
};

export default function LunchBoardClient({
  students,
  initialGroups,
  lunchGroups,
  initialVotes,
  initialTischsprueche,
  canManageTischsprueche,
}: Props) {
  const pathname = usePathname();
  const localeSegments = pathname.split("/").filter(Boolean);
  const locale = (localeSegments[0] === "en" || localeSegments[0] === "de"
    ? localeSegments[0]
    : "de") as "en" | "de";
  const dict = useTranslations();

  const [groups, setGroups] = useState<Record<GroupId, string[]>>(initialGroups);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeChildForVote, setActiveChildForVote] = useState<string | null>(null);
  const [childVotes, setChildVotes] = useState<Record<string, number | null>>(initialVotes);
  const [tischsprueche] = useState<Tischspruch[]>(initialTischsprueche);

  const poolDroppable = useDroppable({ id: "pool" });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 5,
      },
    })
  );

  const studentMap = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students]
  );
  const groupCapacityMap = useMemo(
    () => Object.fromEntries(lunchGroups.map((group) => [group.id, group.capacity])),
    [lunchGroups]
  );

  const getVotesForGroup = (groupId: Exclude<GroupId, "pool">) => {
    const result: Record<number, number> = Object.fromEntries(
      tischsprueche.map((spruch) => [spruch.id, 0])
    );

    groups[groupId].forEach((childId) => {
      const vote = childVotes[childId];
      if (vote && result[vote] !== undefined) result[vote]++;
    });

    return result;
  };

  const getChild = (id: string) => {
    const child = studentMap[id];
    if (!child) return undefined;

    return {
      id: child.id,
      name: `${child.name} ${child.surname}`,
      img: child.img ?? undefined,
      group: child.className,
    };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.lunch.boardTitle}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/list/lunch-groups`}
            className="rounded-full bg-kitaYellow px-3 py-2 text-xs font-medium"
          >
            {dict.lunch.groups}
          </Link>
          <Link
            href={`/${locale}/list/tischsprueche`}
            className="rounded-full bg-kitaYellow px-3 py-2 text-xs font-medium"
          >
            {dict.lunch.tischsprueche}
          </Link>
        </div>
      </div>

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
            if (to !== "pool" && prev[to].length >= (groupCapacityMap[to] ?? 15)) return prev;

            const newGroups = {
              ...prev,
              [from]: prev[from].filter((c) => c !== active.id),
              [to]: [...prev[to], active.id as string],
            };

            void saveLunchGroups(newGroups);
            return newGroups;
          });
        }}
      >
        <div className="flex justify-center gap-6 flex-wrap">
          {lunchGroups.map((group) => (
            <LunchGroup
              key={group.id}
              id={group.id}
              title={group.name}
              color={group.color ?? "bg-gray-50 border-gray-300"}
              childrenIds={groups[group.id] ?? []}
              voteOptions={tischsprueche}
              votes={getVotesForGroup(group.id)}
              votedChildren={(groups[group.id] ?? []).filter((c) => childVotes[c] != null)}
              maxPerGroup={group.capacity}
              onSelectChild={setActiveChildForVote}
              onVote={(tischspruchId: number) => {
                if (!activeChildForVote) return;

                setChildVotes((prev) => ({
                  ...prev,
                  [activeChildForVote]: tischspruchId,
                }));

                void saveLunchVote({
                  studentId: activeChildForVote,
                  groupId: group.id,
                  tischspruchId,
                });

                setActiveChildForVote(null);
              }}
              getChild={getChild}
            />
          ))}
        </div>

        <div
          ref={poolDroppable.setNodeRef}
          className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 h-[450px] overflow-y-auto"
        >
          <h3 className="mb-3 text-center font-semibold sticky top-0 bg-gray-50 z-10">
            All kids
          </h3>

          <div className="grid grid-cols-8 gap-4">
            {groups.pool.map((childId) => {
              const child = getChild(childId);
              if (!child) return null;

              return (
                <Child
                  key={child.id}
                  id={child.id}
                  name={child.name}
                  img={child.img}
                  group={child.group}
                />
              );
            })}
          </div>
        </div>
        <DragOverlay>{activeId && getChild(activeId) ? <Child {...getChild(activeId)!} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
