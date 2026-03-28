"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { saveLunchGroups, saveLunchVote, saveTeacherLunchGroups } from "@/lib/actions";
import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import LunchGroup from "@/components/LunchGroup";
import PlayPoolCard from "@/components/PlayPoolCard";
import type { TeacherLite } from "@/components/PlayAreaCard";
import type { StudentWithClass } from "@/types/student";
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
  teachers: TeacherLite[];
  initialGroups: Record<GroupId, string[]>;
  initialTeacherLunchGroups: Record<GroupId, string[]>;
  lunchGroups: { id: string; name: string; color?: string; capacity: number }[];
  initialVotes: Record<string, number>;
  initialTischsprueche: Tischspruch[];
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
  if (overId.startsWith("kid-lunch-")) {
    return { kind: "child", zone: overId.replace("kid-lunch-", "") };
  }
  if (overId.startsWith("teacher-lunch-")) {
    return { kind: "teacher", zone: overId.replace("teacher-lunch-", "") };
  }
  return null;
}

export default function LunchBoardClient({
  students,
  teachers,
  initialGroups,
  initialTeacherLunchGroups: initialTeacherLunchProp,
  lunchGroups,
  initialVotes,
  initialTischsprueche,
}: Props) {
  const pathname = usePathname();
  const localeSegments = pathname.split("/").filter(Boolean);
  const locale = (localeSegments[0] === "en" || localeSegments[0] === "de"
    ? localeSegments[0]
    : "de") as "en" | "de";
  const dict = useTranslations();

  const [groups, setGroups] = useState<Record<GroupId, string[]>>(() => ({
    ...initialGroups,
    pool: initialGroups.pool ?? [],
  }));
  const [teacherLunchState, setTeacherLunchState] = useState<
    Record<string, string[]>
  >(() => {
    const t = initialTeacherLunchProp ?? {};
    return {
      ...t,
      teacherPool: t.teacherPool ?? [],
    };
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeChildForVote, setActiveChildForVote] = useState<string | null>(null);
  const [childVotes, setChildVotes] = useState<Record<string, number | null>>(initialVotes);
  const [tischsprueche] = useState<Tischspruch[]>(initialTischsprueche);

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
  const teacherMap = useMemo(
    () => Object.fromEntries(teachers.map((x) => [x.id, x])),
    [teachers]
  );

  const groupCapacityMap = useMemo(
    () => Object.fromEntries(lunchGroups.map((group) => [group.id, group.capacity])),
    [lunchGroups]
  );

  const getTeacher = (id: string) => teacherMap[id];

  const getStudentForPool = (id: string): StudentWithClass | undefined => {
    const s = studentMap[id];
    if (!s) return undefined;
    return {
      id: s.id,
      name: s.name,
      surname: s.surname,
      img: s.img,
      class: { name: s.className },
    } as StudentWithClass;
  };

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
      setGroups((prev) => {
        const from = (Object.keys(prev) as GroupId[]).find((g) =>
          prev[g].includes(entityId)
        );
        if (!from || from === toZone) return prev;
        if (
          toZone !== "pool" &&
          prev[toZone].length >= (groupCapacityMap[toZone] ?? 15)
        ) {
          return prev;
        }

        const next = {
          ...prev,
          [from]: prev[from].filter((c) => c !== entityId),
          [toZone]: [...prev[toZone], entityId],
        };
        void saveLunchGroups(next);
        return next;
      });
    } else {
      setTeacherLunchState((prev) => {
        const from = Object.keys(prev).find((z) => prev[z].includes(entityId));
        if (!from || from === toZone) return prev;

        const next: Record<string, string[]> = {
          ...prev,
          [from]: prev[from].filter((t) => t !== entityId),
          [toZone]: [...(prev[toZone] ?? []), entityId],
        };
        void saveTeacherLunchGroups(next);
        return next;
      });
    }
  };

  const activeParsed = activeId ? parseDragId(activeId) : null;
  const activeStudent =
    activeParsed?.kind === "child" ? getChild(activeParsed.id) : null;
  const activeTeacher =
    activeParsed?.kind === "teacher" ? getTeacher(activeParsed.id) : null;

  return (
    <div className="flex flex-col gap-6 max-w-[100vw] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="w-full pb-2">
          <div className="grid w-full gap-4 items-stretch [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
            {lunchGroups.map((group) => (
              <LunchGroup
                key={group.id}
                id={group.id}
                title={group.name}
                color={group.color ?? "bg-gray-50 border-gray-300"}
                educatorIds={teacherLunchState[group.id] ?? []}
                childrenIds={groups[group.id] ?? []}
                voteOptions={tischsprueche}
                votes={getVotesForGroup(group.id)}
                votedChildren={(groups[group.id] ?? []).filter(
                  (c) => childVotes[c] != null
                )}
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
                getTeacher={getTeacher}
                detailHref={`/${locale}/list/lunch-groups/${group.id}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 border-t border-gray-200 pt-6">
          <PlayPoolCard
            droppableId="pool"
            title={dict.playBoard.kidsPool}
            variant="kids"
            ids={groups.pool ?? []}
            getStudent={getStudentForPool}
            getTeacher={getTeacher}
          />
          <PlayPoolCard
            droppableId="teacherPool"
            title={dict.playBoard.educatorsPool}
            variant="teachers"
            ids={teacherLunchState.teacherPool ?? []}
            getStudent={getStudentForPool}
            getTeacher={getTeacher}
          />
        </div>

        <DragOverlay>
          {activeStudent ? (
            <Child
              id={activeStudent.id}
              dragId={`child:${activeStudent.id}`}
              name={activeStudent.name}
              img={activeStudent.img}
              group={activeStudent.group}
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
    </div>
  );
}
