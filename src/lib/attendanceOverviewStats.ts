import prisma from "@/lib/prisma";

/** One bucket for the overview chart (day within month or month within year). */
export type OverviewDatum = {
  /** Short X-axis tick (day number or month abbreviation from container). */
  label: string;
  /** `YYYY-MM-DD` for the bucket start (UTC); used for tooltips. */
  isoDate: string;
  childrenPresent: number;
  educatorsPresent: number;
};

function utcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Daily buckets for one UTC calendar month: distinct children present per day,
 * count of educator present rows per day.
 */
export async function loadAttendanceOverviewMonthUTC(
  year: number,
  monthIndex: number
): Promise<OverviewDatum[]> {
  const rangeStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  const [childRows, eduRows] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        present: true,
        date: { gte: rangeStart, lt: rangeEnd },
      },
      select: { studentId: true, date: true },
    }),
    prisma.teacherAttendance.findMany({
      where: {
        present: true,
        date: { gte: rangeStart, lt: rangeEnd },
      },
      select: { date: true },
    }),
  ]);

  const childrenByDay = new Map<string, Set<string>>();
  for (const r of childRows) {
    const key = utcYmd(r.date);
    if (!childrenByDay.has(key)) childrenByDay.set(key, new Set());
    childrenByDay.get(key)!.add(r.studentId);
  }

  const eduByDay = new Map<string, number>();
  for (const r of eduRows) {
    const key = utcYmd(r.date);
    eduByDay.set(key, (eduByDay.get(key) ?? 0) + 1);
  }

  const out: OverviewDatum[] = [];
  for (let day = 1; ; day += 1) {
    const dt = new Date(Date.UTC(year, monthIndex, day));
    if (dt.getUTCMonth() !== monthIndex) break;
    const key = utcYmd(dt);
    const set = childrenByDay.get(key);
    out.push({
      label: String(day),
      isoDate: key,
      childrenPresent: set?.size ?? 0,
      educatorsPresent: eduByDay.get(key) ?? 0,
    });
  }
  return out;
}

/**
 * Monthly buckets for one UTC calendar year: distinct child–days present in month;
 * educator present rows in month.
 */
export async function loadAttendanceOverviewYearUTC(
  year: number
): Promise<OverviewDatum[]> {
  const rangeStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  const [childRows, eduRows] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        present: true,
        date: { gte: rangeStart, lt: rangeEnd },
      },
      select: { studentId: true, date: true },
    }),
    prisma.teacherAttendance.findMany({
      where: {
        present: true,
        date: { gte: rangeStart, lt: rangeEnd },
      },
      select: { date: true },
    }),
  ]);

  const childPairsByMonth = new Map<number, Set<string>>();
  for (let mi = 0; mi < 12; mi++) childPairsByMonth.set(mi, new Set());

  for (const r of childRows) {
    const mi = r.date.getUTCMonth();
    const dayKey = utcYmd(r.date);
    childPairsByMonth.get(mi)!.add(`${r.studentId}:${dayKey}`);
  }

  const eduCountByMonth = new Map<number, number>();
  for (let mi = 0; mi < 12; mi++) eduCountByMonth.set(mi, 0);
  for (const r of eduRows) {
    const mi = r.date.getUTCMonth();
    eduCountByMonth.set(mi, (eduCountByMonth.get(mi) ?? 0) + 1);
  }

  const out: OverviewDatum[] = [];
  for (let mi = 0; mi < 12; mi++) {
    const isoDate = `${year}-${String(mi + 1).padStart(2, "0")}-01`;
    out.push({
      label: "",
      isoDate,
      childrenPresent: childPairsByMonth.get(mi)!.size,
      educatorsPresent: eduCountByMonth.get(mi) ?? 0,
    });
  }
  return out;
}
