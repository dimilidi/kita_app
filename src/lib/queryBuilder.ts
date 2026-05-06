import { Prisma, UserSex } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";

export type SortOrder = "asc" | "desc";

export function parseSortOrder(raw: string | undefined): SortOrder {
  return raw === "desc" ? "desc" : "asc";
}

export function parsePaginationParams(sp: {
  [key: string]: string | undefined;
}) {
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limitRaw = parseInt(sp.limit ?? String(ITEM_PER_PAGE), 10);
  const limit = Math.min(Math.max(limitRaw || ITEM_PER_PAGE, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function trimSearch(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

function orInsensitiveContains(
  fields: string[],
  search: string | undefined
): Record<string, unknown> | undefined {
  const q = trimSearch(search);
  if (!q) return undefined;
  return {
    OR: fields.map((field) => ({
      [field]: { contains: q, mode: "insensitive" as const },
    })),
  };
}

function compactAnd<T extends Record<string, unknown>>(
  parts: (T | undefined | null | false)[]
): T | undefined {
  const filtered = parts.filter(
    (p): p is T =>
      Boolean(p) &&
      typeof p === "object" &&
      Object.keys(p as object).length > 0
  ) as T[];
  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  return ({ AND: filtered } as unknown) as T;
}

/** Teacher: supervised classes ∪ classes that appear in their lessons. */
export async function classIdsForTeacher(teacherId: string): Promise<number[]> {
  const [supervised, lessonRows] = await Promise.all([
    prisma.class.findMany({
      where: { supervisorId: teacherId },
      select: { id: true },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      select: { classId: true },
    }),
  ]);
  const merged = [
    ...supervised.map((c) => c.id),
    ...lessonRows.map((l) => l.classId),
  ];
  return Array.from(new Set(merged));
}

export async function buildStudentScopeWhere(sp: {
  [key: string]: string | undefined;
}): Promise<Prisma.StudentWhereInput> {
  if (sp.teacherId) {
    const classIds = await classIdsForTeacher(sp.teacherId);
    if (classIds.length > 0) return { classId: { in: classIds } };
    return { id: { in: [] } };
  }
  if (sp.classIds) {
    const ids = sp.classIds
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length > 0) return { classId: { in: ids } };
    return { id: { in: [] } };
  }
  return {};
}

export function buildStudentFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.StudentWhereInput {
  const parts: Prisma.StudentWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["name", "surname", "username"],
    sp.search
  ) as Prisma.StudentWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  if (sp.gradeId) {
    const id = parseInt(sp.gradeId, 10);
    if (Number.isFinite(id)) parts.push({ gradeId: id });
  }

  if (sp.classId) {
    const id = parseInt(sp.classId, 10);
    if (Number.isFinite(id)) parts.push({ classId: id });
  }

  if (sp.lunchGroupId) {
    parts.push({ lunchGroup: { groupId: sp.lunchGroupId } });
  }

  if (sp.sex === "MALE" || sp.sex === "FEMALE") {
    parts.push({ sex: sp.sex as UserSex });
  }

  return compactAnd(parts) ?? {};
}

export function buildStudentOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.StudentOrderByWithRelationInput[] {
  switch (sort) {
    case "createdAt":
      return [{ createdAt: order }];
    case "surname":
      return [{ surname: order }, { name: order }];
    case "username":
      return [{ username: order }];
    case "name":
      return [{ name: order }, { surname: order }];
    default:
      return [{ surname: "asc" }, { name: "asc" }];
  }
}

export async function buildStudentListQuery(sp: {
  [key: string]: string | undefined;
}): Promise<{
  where: Prisma.StudentWhereInput;
  orderBy: Prisma.StudentOrderByWithRelationInput[];
}> {
  const order = parseSortOrder(sp.order);
  const scope = await buildStudentScopeWhere(sp);
  const filters = buildStudentFiltersWhere(sp);
  const where = compactAnd([scope, filters]) ?? {};
  const orderBy = buildStudentOrderBy(sp.sort, order);
  return { where, orderBy };
}

export function buildTeacherFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.TeacherWhereInput {
  const parts: Prisma.TeacherWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["name", "surname", "email"],
    sp.search
  ) as Prisma.TeacherWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  if (sp.classId) {
    const id = parseInt(sp.classId, 10);
    if (Number.isFinite(id)) {
      parts.push({
        OR: [
          { lessons: { some: { classId: id } } },
          { classes: { some: { id } } },
        ],
      });
    }
  }

  if (sp.zoneId) {
    parts.push({ zones: { some: { zoneId: sp.zoneId } } });
  }

  if (sp.lessonId) {
    const lid = parseInt(sp.lessonId, 10);
    if (Number.isFinite(lid)) {
      parts.push({ lessons: { some: { id: lid } } });
    }
  }

  return compactAnd(parts) ?? {};
}

export function buildTeacherOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.TeacherOrderByWithRelationInput[] {
  switch (sort) {
    case "lessonCount":
      return [{ lessons: { _count: order } }];
    case "createdAt":
      return [{ createdAt: order }];
    case "surname":
      return [{ surname: order }, { name: order }];
    case "email":
      return [{ email: order }];
    case "name":
      return [{ name: order }, { surname: order }];
    default:
      return [{ surname: "asc" }, { name: "asc" }];
  }
}

export function buildTeacherListQuery(sp: {
  [key: string]: string | undefined;
}): {
  where: Prisma.TeacherWhereInput;
  orderBy: Prisma.TeacherOrderByWithRelationInput[];
} {
  const order = parseSortOrder(sp.order);
  const where = buildTeacherFiltersWhere(sp);
  const orderBy = buildTeacherOrderBy(sp.sort, order);
  return { where, orderBy };
}

export function buildParentFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.ParentWhereInput {
  const parts: Prisma.ParentWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["name", "surname", "email"],
    sp.search
  ) as Prisma.ParentWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  /** Preferred: childrenFilter = has | none (legacy: childrenMin 1 / 0) */
  let childrenMode = sp.childrenFilter?.toLowerCase();
  if (!childrenMode && sp.childrenMin === "1") childrenMode = "has";
  if (!childrenMode && sp.childrenMin === "0") childrenMode = "none";

  const childrenMinNum = sp.childrenMin ? parseInt(sp.childrenMin, 10) : undefined;
  const childrenMaxNum = sp.childrenMax ? parseInt(sp.childrenMax, 10) : undefined;

  if (
    childrenMode === "none" ||
    (childrenMaxNum !== undefined && Number.isFinite(childrenMaxNum) && childrenMaxNum === 0)
  ) {
    parts.push({ students: { none: {} } });
  } else if (
    childrenMode === "has" ||
    (childrenMinNum !== undefined && Number.isFinite(childrenMinNum) && childrenMinNum >= 1)
  ) {
    parts.push({ students: { some: {} } });
  }

  return compactAnd(parts) ?? {};
}

export function buildParentOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.ParentOrderByWithRelationInput[] {
  switch (sort) {
    case "createdAt":
      return [{ createdAt: order }];
    case "surname":
      return [{ surname: order }, { name: order }];
    case "email":
      return [{ email: order }];
    case "students":
      return [{ students: { _count: order } } as Prisma.ParentOrderByWithRelationInput];
    case "name":
      return [{ name: order }, { surname: order }];
    default:
      return [{ surname: "asc" }, { name: "asc" }];
  }
}

export function buildParentListQuery(sp: {
  [key: string]: string | undefined;
}): {
  where: Prisma.ParentWhereInput;
  orderBy: Prisma.ParentOrderByWithRelationInput[];
} {
  const order = parseSortOrder(sp.order);
  const where = buildParentFiltersWhere(sp);
  const orderBy = buildParentOrderBy(sp.sort, order);
  return { where, orderBy };
}

export function buildClassFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.ClassWhereInput {
  const parts: Prisma.ClassWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["name"],
    sp.search
  ) as Prisma.ClassWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  if (sp.gradeId) {
    const id = parseInt(sp.gradeId, 10);
    if (Number.isFinite(id)) parts.push({ gradeId: id });
  }

  if (sp.supervisorId) {
    parts.push({ supervisorId: sp.supervisorId });
  }

  return compactAnd(parts) ?? {};
}

export function buildClassOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.ClassOrderByWithRelationInput[] {
  switch (sort) {
    case "capacity":
      return [{ capacity: order }];
    case "gradeId":
      return [{ gradeId: order }];
    case "name":
      return [{ name: order }];
    default:
      return [{ name: "asc" }];
  }
}

export function buildClassListQuery(sp: {
  [key: string]: string | undefined;
}): {
  where: Prisma.ClassWhereInput;
  orderBy: Prisma.ClassOrderByWithRelationInput[];
} {
  const order = parseSortOrder(sp.order);
  const where = buildClassFiltersWhere(sp);
  const orderBy = buildClassOrderBy(sp.sort, order);
  return { where, orderBy };
}

/* --- Zones (Play areas list) --- */

export function buildZoneFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.ZoneWhereInput {
  const parts: Prisma.ZoneWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["name"],
    sp.search
  ) as Prisma.ZoneWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  const ha = sp.hasActivities?.toLowerCase();
  if (ha === "1" || ha === "true" || ha === "yes") {
    parts.push({
      OR: [{ lessons: { some: {} } }, { activities: { some: {} } }],
    });
  }

  const capMin = sp.capacityMin ? parseInt(sp.capacityMin, 10) : undefined;
  const capMax = sp.capacityMax ? parseInt(sp.capacityMax, 10) : undefined;
  if (capMin !== undefined && Number.isFinite(capMin)) {
    parts.push({ capacity: { gte: capMin } });
  }
  if (capMax !== undefined && Number.isFinite(capMax)) {
    parts.push({ capacity: { lte: capMax } });
  }

  return compactAnd(parts) ?? {};
}

export function buildZoneOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.ZoneOrderByWithRelationInput[] {
  switch (sort) {
    case "capacity":
      return [{ capacity: order }];
    case "lessons":
      return [{ lessons: { _count: order } }];
    case "name":
      return [{ name: order }];
    default:
      return [{ name: "asc" }];
  }
}

export function buildZoneListQuery(sp: {
  [key: string]: string | undefined;
}): {
  where: Prisma.ZoneWhereInput;
  orderBy: Prisma.ZoneOrderByWithRelationInput[];
} {
  const order = parseSortOrder(sp.order);
  const where = buildZoneFiltersWhere(sp);
  const orderBy = buildZoneOrderBy(sp.sort, order);
  return { where, orderBy };
}

/* --- Events --- */

export function buildEventFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.EventWhereInput {
  const parts: Prisma.EventWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["title"],
    sp.search
  ) as Prisma.EventWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  if (sp.classId) {
    const id = parseInt(sp.classId, 10);
    if (Number.isFinite(id)) parts.push({ classId: id });
  }

  return compactAnd(parts) ?? {};
}

export function buildEventOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.EventOrderByWithRelationInput[] {
  switch (sort) {
    case "title":
      return [{ title: order }];
    case "endTime":
      return [{ endTime: order }];
    case "startTime":
      return [{ startTime: order }];
    default:
      return [{ startTime: "asc" }];
  }
}

/* --- Announcements --- */

export function buildAnnouncementFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.AnnouncementWhereInput {
  const parts: Prisma.AnnouncementWhereInput[] = [];

  const searchWhere = orInsensitiveContains(
    ["title"],
    sp.search
  ) as Prisma.AnnouncementWhereInput | undefined;
  if (searchWhere) parts.push(searchWhere);

  if (sp.classId) {
    const id = parseInt(sp.classId, 10);
    if (Number.isFinite(id)) parts.push({ classId: id });
  }

  return compactAnd(parts) ?? {};
}

export function buildAnnouncementOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.AnnouncementOrderByWithRelationInput[] {
  switch (sort) {
    case "title":
      return [{ title: order }];
    case "date":
      return [{ date: order }];
    default:
      return [{ date: "desc" }];
  }
}

/* --- Lessons (scheduled activities / “activities” list) --- */

export function buildLessonFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.LessonWhereInput {
  const parts: Prisma.LessonWhereInput[] = [];

  const q = trimSearch(sp.search);
  if (q) {
    parts.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { teacher: { name: { contains: q, mode: "insensitive" } } },
        { teacher: { surname: { contains: q, mode: "insensitive" } } },
        { zone: { name: { contains: q, mode: "insensitive" } } },
        { class: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (sp.zoneId) parts.push({ zoneId: sp.zoneId });

  if (sp.classId) {
    const id = parseInt(sp.classId, 10);
    if (Number.isFinite(id)) parts.push({ classId: id });
  }

  if (sp.day) {
    const d = sp.day.trim().toUpperCase();
    if (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(d)) {
      parts.push({ day: d as any });
    }
  }

  /** Dropdown uses `lessonTeacherId` (cleared on reset). `teacherId` kept for profile shortcuts (scope). */
  const educatorId = trimSearch(sp.lessonTeacherId) ?? sp.teacherId;
  if (educatorId) parts.push({ teacherId: educatorId });

  return compactAnd(parts) ?? {};
}

export function buildLessonOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.LessonOrderByWithRelationInput[] {
  switch (sort) {
    case "zone":
      return [{ zone: { name: order } }];
    case "class":
      return [{ class: { name: order } }];
    case "teacher":
      return [{ teacher: { surname: order } }, { teacher: { name: order } }];
    case "day":
      return [{ day: order }];
    case "startTime":
      return [{ startTime: order }];
    case "name":
    default:
      return [{ name: order }];
  }
}

export function buildLessonListQuery(sp: {
  [key: string]: string | undefined;
}): {
  where: Prisma.LessonWhereInput;
  orderBy: Prisma.LessonOrderByWithRelationInput[];
} {
  const ord = parseSortOrder(sp.order);
  const where = buildLessonFiltersWhere(sp);
  const orderBy = buildLessonOrderBy(sp.sort, ord);
  return { where, orderBy };
}

/** Alias: domain language “activity” refers to scheduled `Lesson` rows. */
export const buildActivityFiltersWhere = buildLessonFiltersWhere;
export const buildActivityOrderBy = buildLessonOrderBy;
export const buildActivityListQuery = buildLessonListQuery;

/* --- Tischsprüche --- */

export function buildTischspruchFiltersWhere(sp: {
  [key: string]: string | undefined;
}): Prisma.TischspruchWhereInput {
  const parts: Prisma.TischspruchWhereInput[] = [];

  const q = trimSearch(sp.search);
  if (q) {
    parts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { text: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const pop = sp.popular?.toLowerCase();
  if (pop === "1" || pop === "true" || pop === "yes") {
    parts.push({ votes: { some: {} } });
  }

  return compactAnd(parts) ?? {};
}

export function buildTischspruchOrderBy(
  sort: string | undefined,
  order: SortOrder
): Prisma.TischspruchOrderByWithRelationInput[] {
  switch (sort) {
    case "title":
      return [{ title: order }];
    case "votes":
      return [
        { votes: { _count: order } } as Prisma.TischspruchOrderByWithRelationInput,
      ];
    case "createdAt":
      return [{ createdAt: order }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export function buildTischspruchListQuery(sp: {
  [key: string]: string | undefined;
}): {
  where: Prisma.TischspruchWhereInput;
  orderBy: Prisma.TischspruchOrderByWithRelationInput[];
} {
  const ord = parseSortOrder(sp.order);
  const where = buildTischspruchFiltersWhere(sp);
  const orderBy = buildTischspruchOrderBy(sp.sort, ord);
  return { where, orderBy };
}
