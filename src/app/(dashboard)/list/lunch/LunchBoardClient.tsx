"use client";

import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  clearLunchBoard,
  saveLunchGroups,
  saveLunchVote,
  saveTeacherLunchGroups,
} from "@/lib/actions";
import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import LunchGroup from "@/components/LunchGroup";
import PlayPoolCard from "@/components/PlayPoolCard";
import type { TeacherLite } from "@/components/PlayAreaCard";
import type { StudentWithClass } from "@/types/student";
import clsx from "clsx";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { toast } from "react-toastify";
import WorkingDayDatePicker from "@/components/attendance/WorkingDayDatePicker";
import { todayDateStrLocal } from "@/lib/attendanceDate";

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
  /** YYYY-MM-DD; same query as Attendance (`?date=`). */
  attendanceDateStr: string;
  /** True when any attendance row exists that day — children list is present-only. */
  attendanceFilterActive: boolean;
  /** True when any educator-attendance row exists — only educators marked present appear on the board. */
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
  if (overId.startsWith("kid-lunch-")) {
    return { kind: "child", zone: overId.replace("kid-lunch-", "") };
  }
  if (overId.startsWith("teacher-lunch-")) {
    return { kind: "teacher", zone: overId.replace("teacher-lunch-", "") };
  }
  return null;
}

const SECTION_STORAGE_KEY = "lunch-board-section-order";
const SECTION_SIZES_KEY = "lunch-board-section-sizes";

type SectionSize = { width: number; height: number };

const MIN_SECTION_W = 180;
const MAX_SECTION_W = 1400;
const MIN_SECTION_H = 200;
const MAX_SECTION_H = 1200;

function clampSize(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function defaultSizeForSectionKey(key: string): SectionSize {
  if (key === "kids-pool") {
    return { width: 400, height: 480 };
  }
  return { width: 250, height: 480 };
}

function mergeSectionSizes(
  orderKeys: string[],
  storedRaw: string | null
): Record<string, SectionSize> {
  const out: Record<string, SectionSize> = {};
  let stored: Record<string, SectionSize> = {};
  if (storedRaw) {
    try {
      const p = JSON.parse(storedRaw) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) {
        for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
          if (!v || typeof v !== "object") continue;
          const o = v as Record<string, unknown>;
          const w = Number(o.width);
          const h = Number(o.height);
          if (Number.isFinite(w) && Number.isFinite(h)) {
            stored[k] = {
              width: Math.round(clampSize(w, MIN_SECTION_W, MAX_SECTION_W)),
              height: Math.round(clampSize(h, MIN_SECTION_H, MAX_SECTION_H)),
            };
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  for (const key of orderKeys) {
    out[key] = stored[key] ?? defaultSizeForSectionKey(key);
  }
  return out;
}

function buildEmptyLunchGroups(
  studentIds: string[],
  lunchGroupIds: string[]
): Record<string, string[]> {
  const next: Record<string, string[]> = {
    pool: [...studentIds],
  };
  for (const gid of lunchGroupIds) {
    next[gid] = [];
  }
  return next;
}

function buildEmptyTeacherLunchGroups(
  teacherIds: string[],
  lunchGroupIds: string[]
): Record<string, string[]> {
  const next: Record<string, string[]> = {
    teacherPool: [...teacherIds],
  };
  for (const gid of lunchGroupIds) {
    next[gid] = [];
  }
  return next;
}

function groupSectionId(groupId: string): string {
  return `group-${groupId}`;
}

function parseGroupIdFromSection(sectionId: string): string | null {
  if (!sectionId.startsWith("group-")) return null;
  return sectionId.slice("group-".length);
}

/** Merge saved order with current lunch groups; migrates legacy `lunch-groups` bucket. */
function mergeSectionOrder(
  lunchGroupIds: string[],
  storedRaw: string | null
): string[] {
  const groupKeys = lunchGroupIds.map((id) => groupSectionId(id));
  const pools = ["kids-pool", "educators-pool"] as const;
  const validGroupSet = new Set(groupKeys);

  let stored: unknown = null;
  if (storedRaw) {
    try {
      stored = JSON.parse(storedRaw);
    } catch {
      stored = null;
    }
  }

  if (!Array.isArray(stored)) {
    return [...groupKeys, ...pools];
  }

  const expanded: string[] = [];
  for (const key of stored) {
    if (typeof key !== "string") continue;
    if (key === "lunch-groups") {
      expanded.push(...groupKeys);
    } else {
      expanded.push(key);
    }
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const key of expanded) {
    if (seen.has(key)) continue;
    if (key === "kids-pool" || key === "educators-pool") {
      result.push(key);
      seen.add(key);
    } else if (key.startsWith("group-") && validGroupSet.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const gk of groupKeys) {
    if (!seen.has(gk)) {
      result.push(gk);
      seen.add(gk);
    }
  }

  for (const p of pools) {
    if (!seen.has(p)) {
      result.push(p);
      seen.add(p);
    }
  }

  return result;
}

const SECTION_DRAG_PREFIX = "section-drag-";
const SECTION_DROP_PREFIX = "section-drop-";

function sectionDragId(sectionKey: string): string {
  return `${SECTION_DRAG_PREFIX}${sectionKey}`;
}

function sectionDropId(sectionKey: string): string {
  return `${SECTION_DROP_PREFIX}${sectionKey}`;
}

function parseSectionDragId(raw: string): string | null {
  if (!raw.startsWith(SECTION_DRAG_PREFIX)) return null;
  return raw.slice(SECTION_DRAG_PREFIX.length);
}

function parseSectionDropId(raw: string): string | null {
  if (!raw.startsWith(SECTION_DROP_PREFIX)) return null;
  return raw.slice(SECTION_DROP_PREFIX.length);
}

/** Pointer left of target center → insert before; right → insert after */
function shouldInsertSectionBeforeTarget(
  pointerX: number,
  overRect: { left: number; width: number }
): boolean {
  const midX = overRect.left + overRect.width / 2;
  return pointerX < midX;
}

function BoardSection({
  sectionKey,
  size,
  onSizeChange,
  onResizeEnd,
  children,
  className,
}: {
  sectionKey: string;
  size: SectionSize;
  onSizeChange: (next: SectionSize) => void;
  onResizeEnd: (next: SectionSize) => void;
  children: (dragHandle: ReactNode) => ReactNode;
  className?: string;
}) {
  const dragId = sectionDragId(sectionKey);
  const dropId = sectionDropId(sectionKey);

  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: dragId });
  const { setNodeRef: setDropNodeRef, isOver: isDropOver } = useDroppable({
    id: dropId,
  });

  const setRefs = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.88 : undefined,
  };

  const dragHandle = (
    <button
      type="button"
      className="cursor-grab active:cursor-grabbing touch-none shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200/80"
      aria-label="Reorder section"
      {...attributes}
      {...listeners}
    >
      <span className="text-base leading-none select-none" aria-hidden>
        ⋮⋮
      </span>
    </button>
  );

  const resizeEndRef = useRef<SectionSize | null>(null);

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const captureEl = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const w0 = size.width;
    const h0 = size.height;
    resizeEndRef.current = size;
    captureEl.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dw = ev.clientX - startX;
      const dh = ev.clientY - startY;
      const next: SectionSize = {
        width: Math.round(clampSize(w0 + dw, MIN_SECTION_W, MAX_SECTION_W)),
        height: Math.round(clampSize(h0 + dh, MIN_SECTION_H, MAX_SECTION_H)),
      };
      resizeEndRef.current = next;
      onSizeChange(next);
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        captureEl.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      const final = resizeEndRef.current;
      resizeEndRef.current = null;
      if (final) onResizeEnd(final);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      ref={setRefs}
      style={{
        ...style,
        width: size.width,
        height: size.height,
      }}
      className={clsx(
        "relative flex min-h-0 shrink-0 flex-col overflow-hidden max-w-full",
        isDropOver && "ring-2 ring-kitaSky/40 rounded-lg",
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children(dragHandle)}
      </div>
      <div
        aria-label="Resize section"
        title="Resize section"
        className="absolute bottom-1 right-1 z-30 h-3 w-3 cursor-se-resize touch-none rounded-sm border border-gray-500 bg-white shadow"
        onPointerDown={onResizePointerDown}
      />
    </div>
  );
}

export default function LunchBoardClient({
  students,
  teachers,
  initialGroups,
  initialTeacherLunchGroups: initialTeacherLunchProp,
  lunchGroups,
  initialVotes,
  initialTischsprueche,
  attendanceDateStr,
  attendanceFilterActive,
  teacherAttendanceFilterActive = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const localeSegments = pathname.split("/").filter(Boolean);
  const locale = (localeSegments[0] === "en" || localeSegments[0] === "de"
    ? localeSegments[0]
    : "de") as "en" | "de";
  const dict = useTranslations();

  const [dateNavPending, startDateNavTransition] = useTransition();
  const isToday = attendanceDateStr === todayDateStrLocal();
  const canEditDate = isToday;

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

  const lunchGroupIds = useMemo(
    () => lunchGroups.map((g) => g.id),
    [lunchGroups]
  );
  const lunchGroupIdsKey = lunchGroupIds.join(",");

  const [sectionOrder, setSectionOrder] = useState<string[]>(() =>
    mergeSectionOrder(lunchGroupIds, null)
  );

  const [sectionSizes, setSectionSizes] = useState<Record<string, SectionSize>>(
    () => ({})
  );

  /** Latest pointer for section drop: before/after target by horizontal midpoint */
  const pointerRef = useRef({ x: 0, y: 0 });
  const [draggingSection, setDraggingSection] = useState(false);
  const [clearingBoard, setClearingBoard] = useState(false);

  useEffect(() => {
    const fn = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", fn, { passive: true });
    return () => window.removeEventListener("pointermove", fn);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(SECTION_STORAGE_KEY);
    setSectionOrder(mergeSectionOrder(lunchGroupIds, raw));
  }, [lunchGroupIdsKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawOrder = localStorage.getItem(SECTION_STORAGE_KEY);
    const order = mergeSectionOrder(lunchGroupIds, rawOrder);
    const rawSizes = localStorage.getItem(SECTION_SIZES_KEY);
    setSectionSizes(mergeSectionSizes(order, rawSizes));
  }, [lunchGroupIdsKey]);

  const handleSectionSizeChange = (sectionKey: string, next: SectionSize) => {
    setSectionSizes((prev) => ({ ...prev, [sectionKey]: next }));
  };

  const handleSectionResizeEnd = (sectionKey: string, next: SectionSize) => {
    setSectionSizes((prev) => {
      const merged = { ...prev, [sectionKey]: next };
      try {
        localStorage.setItem(SECTION_SIZES_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  };

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

  const handleClearLunchboard = async () => {
    if (!canEditDate) return;
    if (!window.confirm(dict.lunch.clearLunchboardConfirm)) return;
    setClearingBoard(true);
    try {
      await clearLunchBoard();
      const studentIds = students.map((s) => s.id);
      const teacherIds = teachers.map((t) => t.id);
      setGroups(buildEmptyLunchGroups(studentIds, lunchGroupIds));
      setTeacherLunchState(
        buildEmptyTeacherLunchGroups(teacherIds, lunchGroupIds)
      );
      setChildVotes({});
      setActiveChildForVote(null);
      toast.success(dict.lunch.clearLunchboardSuccess);
    } catch {
      toast(dict.forms.somethingWentWrong);
    } finally {
      setClearingBoard(false);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggingSection(false);
    if (!canEditDate) return;

    const fromKey = parseSectionDragId(String(active.id));
    if (fromKey) {
      if (!over) return;
      const toKey = parseSectionDropId(String(over.id));
      if (!toKey || fromKey === toKey) return;

      const insertBefore = shouldInsertSectionBeforeTarget(
        pointerRef.current.x,
        over.rect
      );

      setSectionOrder((prev) => {
        const without = prev.filter((k) => k !== fromKey);
        const targetIdx = without.indexOf(toKey);
        if (targetIdx === -1) return prev;
        const insertAt = insertBefore ? targetIdx : targetIdx + 1;
        const next = [...without];
        next.splice(insertAt, 0, fromKey);
        try {
          localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      return;
    }

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

  const lgd = dict.lunchGroups.detail ?? {};

  const boardDateLong = useMemo(() => {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(attendanceDateStr);
    const d = ok ? new Date(`${attendanceDateStr}T12:00:00`) : new Date();
    return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
      dateStyle: "long",
    });
  }, [attendanceDateStr, locale]);

  /** Full-board print: every meal group with current placements (same structure as PDF export). */
  const lunchPrintSections = useMemo(() => {
    return lunchGroups.map((group) => {
      const educatorNames = (teacherLunchState[group.id] ?? [])
        .map((tid) => {
          const t = teacherMap[tid];
          return t ? `${t.name} ${t.surname}`.trim() : "";
        })
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      const childrenRaw = (groups[group.id] ?? [])
        .map((sid) => {
          const s = studentMap[sid];
          if (!s) return null;
          return {
            name: `${s.name} ${s.surname}`.trim(),
            className: s.className,
          };
        })
        .filter(Boolean) as { name: string; className: string }[];

      childrenRaw.sort((a, b) => a.name.localeCompare(b.name));

      let tischspruchTitle: string | null = null;
      if (tischsprueche.length > 0) {
        const counts = new Map<number, number>();
        for (const cid of groups[group.id] ?? []) {
          const vid = childVotes[cid];
          if (vid != null) counts.set(vid, (counts.get(vid) ?? 0) + 1);
        }
        const winner = tischsprueche.reduce((best, opt) => {
          const cv = counts.get(opt.id) ?? 0;
          const bv = counts.get(best.id) ?? 0;
          return cv > bv ? opt : best;
        }, tischsprueche[0]);
        tischspruchTitle = winner.title;
      }

      return {
        groupName: group.name,
        capacity: group.capacity,
        educatorNames,
        children: childrenRaw,
        tischspruchTitle,
      };
    });
  }, [
    lunchGroups,
    groups,
    teacherLunchState,
    childVotes,
    tischsprueche,
    studentMap,
    teacherMap,
  ]);

  return (
    <>
      <div className="print:hidden">
        <div className="flex flex-col gap-6 max-w-[100vw] mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="hidden md:block text-lg font-semibold">
            {dict.lunch.boardTitle}
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            <Link
              href={`/${locale}/list/attendance?date=${encodeURIComponent(attendanceDateStr)}`}
              className="font-medium text-gray-800 underline-offset-2 hover:underline"
            >
              {dict.lunch.attendanceDayLabel}: {attendanceDateStr}
            </Link>
            {" — "}
            {attendanceFilterActive
              ? dict.lunch.presentChildrenOnly
              : dict.lunch.noAttendanceForDayShowingAll}
          </p>
          {teacherAttendanceFilterActive ? (
            <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
              {dict.lunch.teacherAttendanceBoardNote}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3 flex-wrap justify-end">
          {!canEditDate ? (
            <span
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500"
              title="Viewing a past day"
              aria-label="Viewing a past day"
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
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V8a5 5 0 0 1 10 0v3" />
              </svg>
            </span>
          ) : null}
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

          <WorkingDayDatePicker
            value={attendanceDateStr}
            disabled={dateNavPending}
            ariaLabel={dict.forms.date}
            onChange={(next) =>
              startDateNavTransition(() => {
                const current = new URLSearchParams(
                  typeof window !== "undefined" ? window.location.search : ""
                );
                const params = new URLSearchParams();
                params.set("date", next);
                const search = current.get("search");
                if (search) params.set("search", search);
                router.replace(`${pathname}?${params.toString()}`);
              })
            }
          />

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
                  <span>{lgd.printList ?? "Print list"}</span>
                </button>

                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={clearingBoard || !canEditDate}
                  onClick={() => {
                    setActionsOpen(false);
                    void handleClearLunchboard();
                  }}
                  title={!canEditDate ? "Only available for today" : undefined}
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
                  <span>{dict.lunch.clearLunchboard}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        autoScroll
        onDragStart={({ active }) => {
          const id = String(active.id);
          setActiveId(id);
          setDraggingSection(id.startsWith(SECTION_DRAG_PREFIX));
        }}
        onDragCancel={() => setDraggingSection(false)}
        onDragEnd={onDragEnd}
      >
        <div className="flex w-full flex-wrap gap-4 items-start pb-2">
          {sectionOrder.map((sectionId) => {
            if (sectionId === "kids-pool") {
              const sz =
                sectionSizes[sectionId] ?? defaultSizeForSectionKey(sectionId);
              return (
                <BoardSection
                  key={sectionId}
                  sectionKey={sectionId}
                  size={sz}
                  onSizeChange={(next) =>
                    handleSectionSizeChange(sectionId, next)
                  }
                  onResizeEnd={(next) =>
                    handleSectionResizeEnd(sectionId, next)
                  }
                >
                  {(handle) => (
                    <PlayPoolCard
                      droppableId="pool"
                      dragHandle={handle}
                      title={dict.playBoard.kidsPool}
                      variant="kids"
                      ids={groups.pool ?? []}
                      getStudent={getStudentForPool}
                      getTeacher={getTeacher}
                      suspendDroppables={draggingSection}
                      fillSectionHeight
                    />
                  )}
                </BoardSection>
              );
            }
            if (sectionId === "educators-pool") {
              const sz =
                sectionSizes[sectionId] ?? defaultSizeForSectionKey(sectionId);
              return (
                <BoardSection
                  key={sectionId}
                  sectionKey={sectionId}
                  size={sz}
                  onSizeChange={(next) =>
                    handleSectionSizeChange(sectionId, next)
                  }
                  onResizeEnd={(next) =>
                    handleSectionResizeEnd(sectionId, next)
                  }
                >
                  {(handle) => (
                    <PlayPoolCard
                      droppableId="teacherPool"
                      dragHandle={handle}
                      title={dict.playBoard.educatorsPool}
                      variant="teachers"
                      ids={teacherLunchState.teacherPool ?? []}
                      getStudent={getStudentForPool}
                      getTeacher={getTeacher}
                      suspendDroppables={draggingSection}
                      fillSectionHeight
                    />
                  )}
                </BoardSection>
              );
            }

            const gid = parseGroupIdFromSection(sectionId);
            if (!gid) return null;
            const group = lunchGroups.find((g) => g.id === gid);
            if (!group) return null;

            const sz =
              sectionSizes[sectionId] ?? defaultSizeForSectionKey(sectionId);
            return (
              <BoardSection
                key={sectionId}
                sectionKey={sectionId}
                size={sz}
                onSizeChange={(next) =>
                  handleSectionSizeChange(sectionId, next)
                }
                onResizeEnd={(next) =>
                  handleSectionResizeEnd(sectionId, next)
                }
              >
                {(handle) => (
                  <LunchGroup
                    dragHandle={handle}
                    suspendDroppables={draggingSection}
                    fillSectionHeight
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
                    onSelectChild={(id) => {
                      if (!canEditDate) return;
                      setActiveChildForVote(id);
                    }}
                    onVote={(tischspruchId: number) => {
                      if (!canEditDate) return;
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
                )}
              </BoardSection>
            );
          })}
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
      </div>

      <div className="hidden print:block print:w-full print:max-w-none print:[overflow:visible]">
        {lunchPrintSections.length === 0 ? (
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
          lunchPrintSections.map((sec, sectionIdx) => (
            <div
              key={sec.groupName + sectionIdx}
              className="print:p-8 max-w-none"
              style={
                sectionIdx > 0 ? { breakBefore: "page" as const } : undefined
              }
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {sec.groupName}
                </h1>
                <p className="text-sm text-gray-600 shrink-0">
                  {boardDateLong}
                </p>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt=""
                  className="h-[18px] w-[18px] object-contain"
                />
                <span className="font-bold text-base text-gray-900">
                  {lgd.pdfBrandName}
                </span>
              </div>
              <p className="text-sm text-gray-800 mb-2">
                {sec.educatorNames.length > 0
                  ? `${lgd.pdfEducators}: ${sec.educatorNames.join(", ")}`
                  : `${lgd.pdfEducators}: —`}
              </p>
              <p className="text-sm text-gray-800 mb-3">
                {`${lgd.pdfTischspruch}: ${sec.tischspruchTitle ?? "—"}`}
              </p>
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
                {lgd.pdfTotal}: {sec.children.length} / {sec.capacity ?? 15}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
