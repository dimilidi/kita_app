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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import WorkingDayDatePicker from "@/components/attendance/WorkingDayDatePicker";

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
  /** Teacher ids locked by an active Lesson right now. */
  lockedTeacherIds?: string[];
  /** YYYY-MM-DD; same query + normalization as Lunch Board (`?date=`). */
  attendanceDateStr: string;
  /** True when any educator-attendance row exists — only educators marked present load into the board. */
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
  lockedTeacherIds = [],
  attendanceDateStr,
  teacherAttendanceFilterActive = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const localeSegments = pathname.split("/").filter(Boolean);
  const locale =
    localeSegments[0] === "en" || localeSegments[0] === "de"
      ? localeSegments[0]
      : "de";

  const dict = useTranslations();
  const lgd = dict.lunchGroups.detail ?? {};

  const [dateNavPending, startDateNavTransition] = useTransition();

  const zoneIds = useMemo(() => zones.map((z) => z.id), [zones]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const teacherIds = useMemo(() => teachers.map((t) => t.id), [teachers]);
  const lockedTeacherIdSet = useMemo(
    () => new Set(lockedTeacherIds),
    [lockedTeacherIds]
  );

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = actionsRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [actionsOpen]);

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

  const boardDateLong = useMemo(() => {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(attendanceDateStr);
    const d = ok ? new Date(`${attendanceDateStr}T12:00:00`) : new Date();
    return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
      dateStyle: "long",
    });
  }, [attendanceDateStr, locale]);

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
      if (lockedTeacherIdSet.has(entityId)) {
        toast("Teacher is currently in an activity and cannot be moved");
        return;
      }
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
        saveTeacherZones(next).catch((e) => {
          const msg =
            e instanceof Error ? e.message : typeof e === "string" ? e : "";
          if (msg.includes("Cannot reassign teacher during active activity")) {
            toast("Teacher is currently in an activity and cannot be moved");
          } else {
            toast(dict.forms.somethingWentWrong);
          }
        });
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
              href={`/${locale}/list/attendance?date=${encodeURIComponent(attendanceDateStr)}`}
              className="font-medium text-gray-800 underline-offset-2 hover:underline"
            >
              {dict.lunch.attendanceDayLabel}: {attendanceDateStr}
            </Link>
          </p>
          {teacherAttendanceFilterActive ? (
            <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
              {dict.lunch.teacherAttendanceBoardNote}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <WorkingDayDatePicker
              value={attendanceDateStr}
              disabled={dateNavPending}
              ariaLabel={dict.forms?.date ?? "Date"}
              onChange={(next) =>
                startDateNavTransition(() => {
                  router.replace(`${pathname}?date=${encodeURIComponent(next)}`);
                })
              }
            />
            <button
              type="button"
              className="self-end h-[34px] px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={dateNavPending}
              onClick={() =>
                startDateNavTransition(() => {
                  router.replace(
                    `${pathname}?date=${encodeURIComponent(todayDateStrLocal())}`
                  );
                })
              }
            >
              {dict.attendancePage?.today ?? "Today"}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 flex-wrap justify-end">
          <Link
            href={`/${locale}/list/areas`}
            className="rounded-full bg-kitaYellow px-3 py-2 text-xs font-medium"
          >
            {dict.playBoard.playAreasLink}
          </Link>
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              className="h-[36px] w-[36px] rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50"
              onClick={() => setActionsOpen((v) => !v)}
              aria-label={dict.common?.actions ?? "Actions"}
              title={dict.common?.actions ?? "Actions"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-5 h-5 text-gray-700"
                aria-hidden="true"
              >
                <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                <circle cx="12" cy="18.5" r="1.6" fill="currentColor" />
              </svg>
            </button>

            {actionsOpen ? (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setActionsOpen(false);
                    window.print();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M6 9V3h12v6" />
                    <rect x="6" y="14" width="12" height="7" rx="1" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  </svg>
                  <span>{dict.areasList.exportPrint}</span>
                </button>

                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={clearingBoard}
                  onClick={() => {
                    setActionsOpen(false);
                    void handleClearPlayBoard();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 16h10l1-16" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                  <span>{dict.playBoard.clearPlayBoard}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => {
          const parsed = parseDragId(String(active.id));
          if (parsed?.kind === "teacher" && lockedTeacherIdSet.has(parsed.id)) {
            return;
          }
          setActiveId(String(active.id));
        }}
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
              <p className="text-sm text-gray-600 shrink-0">{boardDateLong}</p>
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
                <p className="text-sm text-gray-600 shrink-0">{boardDateLong}</p>
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
