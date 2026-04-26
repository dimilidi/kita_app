/** Monday–Friday buckets (indices 0–4) for dashboard attendance charts. */

export function getWeekMondayLocal(reference: Date = new Date()): Date {
  // Week anchor must be computed in UTC to align with UTC-stored attendance buckets.
  const dayOfWeek = reference.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate()
    )
  );
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday;
}

export function weekdayShortLabelsMonFri(
  lastMonday: Date,
  intlLocale: string
): string[] {
  return Array.from({ length: 5 }, (_, idx) => {
    const d = new Date(lastMonday);
    d.setUTCDate(lastMonday.getUTCDate() + idx);
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(
      d
    );
  });
}

export function aggregateRowsByMonFriWeekday(
  rows: { date: Date; present: boolean }[]
): { present: number; absent: number }[] {
  const counts = Array.from({ length: 5 }, () => ({
    present: 0,
    absent: 0,
  }));
  for (const item of rows) {
    const itemDate = new Date(item.date);
    // Attendance dates are stored as UTC timestamps (day buckets at 00:00Z),
    // so weekday assignment must use UTC to avoid shifting across days.
    const dow = itemDate.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      const idx = dow - 1;
      if (item.present) {
        counts[idx].present += 1;
      } else {
        counts[idx].absent += 1;
      }
    }
  }
  return counts;
}

/** Educators: explicit row counts grouped by weekday (Mon–Fri). */
export function aggregateEducatorRowsByMonFriWeekday(
  rows: { date: Date; present: boolean }[]
): { present: number; absent: number }[] {
  return aggregateRowsByMonFriWeekday(rows);
}

/**
 * Educators: Mon–Fri buckets (same query window as {@link aggregateRowsByMonFriWeekday}).
 *
 * Matches children chart behavior: if **no** `TeacherAttendance` row exists for that weekday
 * bucket in the loaded week (future day, past day without entries, etc.) → `{ present: 0, absent: 0 }`
 * (“no data”), not “everyone absent”.
 *
 * When **at least one** row exists for that day: `present` = count of `present === true`,
 * `absent` = `totalEducators - present` (remaining teachers are absent or unrecorded within a taken roll).
 */
export function aggregateEducatorAttendanceByMonFriWeekday(
  rows: { date: Date; present: boolean }[],
  totalEducators: number
): { present: number; absent: number }[] {
  const bucketRows: { date: Date; present: boolean }[][] = Array.from(
    { length: 5 },
    () => []
  );

  for (const item of rows) {
    const dow = new Date(item.date).getDay();
    if (dow >= 1 && dow <= 5) {
      bucketRows[dow - 1].push(item);
    }
  }

  return bucketRows.map((dayRows) => {
    if (dayRows.length === 0) {
      return { present: 0, absent: 0 };
    }
    const rawPresent = dayRows.filter((r) => r.present).length;
    const present = Math.min(rawPresent, totalEducators);
    return {
      present,
      absent: Math.max(0, totalEducators - present),
    };
  });
}
