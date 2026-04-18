/** Sep 1 (start) through Aug 31 (inclusive) in the *next* calendar year, as [start, end) in UTC. */
export const ACADEMIC_YEAR_STARTS = [2023, 2024, 2025] as const;
export type AcademicYearStart = (typeof ACADEMIC_YEAR_STARTS)[number];

export function formatAcademicYearLabel(startYear: number): string {
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

/** Default “current” school year: Sep–Dec = that year; Jan–Aug = previous year’s Sept start. */
export function getDefaultAcademicYearStart(
  reference: Date = new Date()
): number {
  const y = reference.getFullYear();
  const m = reference.getMonth();
  if (m >= 8) return y;
  return y - 1;
}

export function parseAcademicYearQuery(
  raw: string | undefined
): AcademicYearStart {
  if (raw == null || raw === "") {
    return clampAcademicYearStart(getDefaultAcademicYearStart());
  }
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) {
    return clampAcademicYearStart(getDefaultAcademicYearStart());
  }
  return clampAcademicYearStart(n);
}

function clampAcademicYearStart(n: number): AcademicYearStart {
  if (n <= ACADEMIC_YEAR_STARTS[0]) return ACADEMIC_YEAR_STARTS[0];
  if (n >= ACADEMIC_YEAR_STARTS[ACADEMIC_YEAR_STARTS.length - 1]) {
    return ACADEMIC_YEAR_STARTS[ACADEMIC_YEAR_STARTS.length - 1];
  }
  const allowed = ACADEMIC_YEAR_STARTS as readonly number[];
  return (allowed.includes(n) ? n : getDefaultAcademicYearStart()) as AcademicYearStart;
}

/** [Sep 1 startYear UTC, Sep 1 startYear+1 UTC). */
export function academicYearUtcRange(startYear: number): {
  start: Date;
  end: Date;
} {
  const start = new Date(Date.UTC(startYear, 8, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(startYear + 1, 8, 1, 0, 0, 0, 0));
  return { start, end };
}
