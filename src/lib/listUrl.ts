/**
 * URL helpers for list pages: search, filter, sort, pagination share the same query string.
 */

/** Params that scope a list (e.g. teacher dashboard) and should survive “reset filters”. */
export const LIST_SCOPE_PARAM_KEYS = ["teacherId", "classIds"] as const;

export type ListScopeParamKey = (typeof LIST_SCOPE_PARAM_KEYS)[number];

const LIST_QUERY_KEYS = [
  "search",
  "sort",
  "order",
  "page",
  "limit",
  "gradeId",
  "classId",
  "sex",
  "zoneId",
  "supervisorId",
  "lessonId",
  "childrenMin",
  "childrenMax",
  "childrenFilter",
  "lunchGroupId",
  "hasActivities",
  "capacityMin",
  "capacityMax",
  "popular",
  "filter",
  "lessonTeacherId",
] as const;

export type ListQueryParamKey = (typeof LIST_QUERY_KEYS)[number];

export function buildListUrl(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
  options?: { resetPage?: boolean }
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  if (options?.resetPage !== false) {
    next.set("page", "1");
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function resetListQueryParams(
  current: URLSearchParams,
  pathname: string
): string {
  const next = new URLSearchParams();
  for (const key of LIST_SCOPE_PARAM_KEYS) {
    const v = current.get(key);
    if (v) next.set(key, v);
  }
  return next.toString() ? `${pathname}?${next}` : pathname;
}
