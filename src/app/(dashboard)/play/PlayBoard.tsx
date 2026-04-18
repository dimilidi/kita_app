"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import PlayAreaCard, { TeacherLite } from "@/components/PlayAreaCard";
import PlayPoolCard from "@/components/PlayPoolCard";
import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import { clearPlayBoard, saveTeacherZones, saveZones } from "@/lib/actions";
import ZonePanel from "@/components/ZonePanel";
import { StudentWithClass } from "@/types/student";
import { Zone } from "@prisma/client";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { toast } from "react-toastify";
import { todayDateStrLocal } from "@/lib/attendanceDate";

type ZoneId = string;

type Props = {
  students: StudentWithClass[];
  teachers: TeacherLite[];
  zones: Zone[];
  initialZones: Record<ZoneId, string[]>;
  /** Omitted or partial when not loaded yet — pool keys default to []. */
  initialTeacherZones?: Record<ZoneId, string[]>;
  /** Catalog + scheduled activity titles per zone (for print/PDF-style export). */
  zoneActivityNames?: Record<string, string[]>;
  /** YYYY-MM-DD; same query as educator attendance (`?date=`). */
  boardDateStr?: string;
  /** True when any educator-attendance row exists for that day — list is present-only. */
  teacherAttendanceFilterActive?: boolean;
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

function buildEmptyPlayZones(
  zoneIds: string[],
  studentIds: string[]
): Record<string, string[]> {
  const next: Record<string, string[]> = {
    pool: [...studentIds],
  };
  for (const id of zoneIds) {
    next[id] = [];
  }
  return next;
}

function buildEmptyTeacherZonesForBoard(
  zoneIds: string[],
  teacherIds: string[]
): Record<string, string[]> {
  const next: Record<string, string[]> = {
    teacherPool: [...teacherIds],
  };
  for (const id of zoneIds) {
    next[id] = [];
  }
  return next;
}

export default function PlayBoard({
  students,
  teachers,
  zones,
  initialZones,
  initialTeacherZones: initialTeacherZonesProp,
  zoneActivityNames = {},
  boardDateStr: boardDateStrProp,
  teacherAttendanceFilterActive = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [dateNavPending, startDateNavTransition] = useTransition();
  const boardDateStr = boardDateStrProp ?? todayDateStrLocal();
  const localeSegments = pathname.split("/").filter(Boolean);
  const locale =
    localeSegments[0] === "en" || localeSegments[0] === "de"
      ? localeSegments[0]
      : "de";

  const dict = useTranslations();
  const lgd = dict.lunchGroups.detail ?? {};

  const zoneIds = useMemo(() => zones.map((z) => z.id), [zones]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const teacherIds = useMemo(() => teachers.map((t) => t.id), [teachers]);

  const [clearingBoard, setClearingBoard] = useState(false);

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

  const dateLong = useMemo(
    () =>
      new Date(`${boardDateStr}T12:00:00`).toLocaleDateString(
        locale === "de" ? "de-DE" : "en-GB",
        { dateStyle: "long" }
      ),
    [locale, boardDateStr]
  );

  /** Full-board print: every zone with current placements (matches play areas list/PDF layout). */
  const playPrintSections = useMemo(() => {
    return zones.map((zone) => {
      const educatorNames = (teacherZonesState[zone.id] ?? [])
        .map((tid) => {
          const t = getTeacher(tid);
          return t ? `${t.name} ${t.surname}`.trim() : "";
        })
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      const activityNames = zoneActivityNames[zone.id] ?? [];

      const childrenRaw = (zonesState[zone.id] ?? [])
        .map((sid) => {
          const s = getStudent(sid);
          if (!s) return null;
          return {
            name: `${s.name} ${s.surname}`.trim(),
            className: s.class.name,
          };
        })
        .filter(Boolean) as { name: string; className: string }[];

      childrenRaw.sort((a, b) => a.name.localeCompare(b.name));

      return {
        areaName: zone.name,
        capacity: zone.capacity,
        educatorNames,
        activityNames,
        children: childrenRaw,
      };
    });
  }, [
    zones,
    zonesState,
    teacherZonesState,
    zoneActivityNames,
    students,
    teachers,
  ]);

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

  const handleClearPlayBoard = async () => {
    if (!window.confirm(dict.playBoard.clearPlayBoardConfirm)) return;
    setClearingBoard(true);
    try {
      await clearPlayBoard();
      setZonesState(buildEmptyPlayZones(zoneIds, studentIds));
      setTeacherZonesState(
        buildEmptyTeacherZonesForBoard(zoneIds, teacherIds)
      );
      setOpenZone(null);
      toast.success(dict.playBoard.clearPlayBoardSuccess);
    } catch {
      toast(dict.forms.somethingWentWrong);
    } finally {
      setClearingBoard(false);
    }
  };

  return (
    <>
      <div className="print:hidden">
        <div className="flex flex-col gap-6 max-w-[100vw] mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="hidden md:block text-lg font-semibold">
            {dict.playBoard.boardTitle}
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            <Link
              href={`/${locale}/list/teachers-attendance?date=${encodeURIComponent(boardDateStr)}`}
              className="font-medium text-gray-800 underline-offset-2 hover:underline"
            >
              {dict.playBoard.educatorAttendanceDayLabel}: {boardDateStr}
            </Link>
            {" — "}
            {teacherAttendanceFilterActive
              ? dict.playBoard.presentEducatorsOnly
              : dict.playBoard.noTeacherAttendanceShowingAllEducators}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              <span>{dict.forms.date}</span>
              <input
                type="date"
                className="border rounded-md px-2 py-1.5 text-sm bg-white"
                value={boardDateStr}
                disabled={dateNavPending}
                onChange={(e) =>
                  startDateNavTransition(() =>
                    router.replace(
                      `${pathname}?date=${encodeURIComponent(e.target.value)}`
                    )
                  )
                }
              />
            </label>
            <button
              type="button"
              className="self-end h-[34px] px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50"
              disabled={dateNavPending}
              onClick={() =>
                startDateNavTransition(() =>
                  router.replace(
                    `${pathname}?date=${encodeURIComponent(todayDateStrLocal())}`
                  )
                )
              }
            >
              {dict.playBoard.today}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            {dict.areasList.exportPrint}
          </button>
          <Link
            href={`/${locale}/list/areas`}
            className="rounded-full bg-kitaYellow px-3 py-2 text-xs font-medium"
          >
            {dict.playBoard.playAreasLink}
          </Link>
          <button
            type="button"
            disabled={clearingBoard}
            onClick={() => void handleClearPlayBoard()}
            className="rounded-full border border-amber-600/40 bg-amber-100 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-200/90 disabled:opacity-50"
          >
            {dict.playBoard.clearPlayBoard}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="space-y-6">
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
        </div>
      </div>

      <div className="hidden print:block print:w-full print:max-w-none print:[overflow:visible]">
        {playPrintSections.length === 0 ? (
          <div className="print:p-8">
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-xl font-bold text-gray-900">
                {dict.common.noResults}
              </h1>
              <p className="text-sm text-gray-600 shrink-0">{dateLong}</p>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <img
                src="/logo.jpg"
                alt=""
                className="h-[18px] w-[18px] object-contain"
              />
              <span className="font-bold text-base text-gray-900">
                {lgd.pdfBrandName}
              </span>
            </div>
          </div>
        ) : (
          playPrintSections.map((sec, sectionIdx) => (
            <div
              key={sec.areaName + sectionIdx}
              className="print:p-8 max-w-none"
              style={
                sectionIdx > 0 ? { breakBefore: "page" as const } : undefined
              }
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {sec.areaName}
                </h1>
                <p className="text-sm text-gray-600 shrink-0">{dateLong}</p>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt=""
                  className="h-[18px] w-[18px] object-contain"
                />
                <span className="font-bold text-base text-gray-900">
                  {lgd.pdfBrandName}
                </span>
              </div>

              <h2 className="text-sm font-semibold text-gray-900 mt-4 mb-1">
                {dict.areasList.pdfSectionEducators}
              </h2>
              <p className="text-sm text-gray-800 mb-4">
                {sec.educatorNames.length > 0
                  ? sec.educatorNames.join(", ")
                  : "—"}
              </p>

              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                {dict.areasList.pdfSectionActivities}
              </h2>
              <p className="text-sm text-gray-800 mb-4">
                {sec.activityNames.length > 0
                  ? sec.activityNames.join(", ")
                  : "—"}
              </p>

              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                {dict.areasList.pdfSectionChildren}
              </h2>
              <table className="w-full text-sm border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 p-2 w-12 text-center font-semibold">
                      {lgd.pdfColNum}
                    </th>
                    <th className="border border-gray-400 p-2 text-left font-semibold">
                      {lgd.pdfColChildName}
                    </th>
                    <th className="border border-gray-400 p-2 text-left font-semibold">
                      {lgd.pdfColGroup}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sec.children.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="border border-gray-400 p-2 text-gray-500 text-center"
                      >
                        —
                      </td>
                    </tr>
                  ) : (
                    sec.children.map((c, i) => (
                      <tr key={`${c.name}-${i}`} className="even:bg-gray-50">
                        <td className="border border-gray-400 p-2 text-center tabular-nums">
                          {i + 1}
                        </td>
                        <td className="border border-gray-400 p-2">{c.name}</td>
                        <td className="border border-gray-400 p-2">
                          {c.className}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className="mt-4 text-base font-semibold">
                {lgd.pdfTotal}: {sec.children.length} /{" "}
                {sec.capacity != null ? sec.capacity : "—"}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
