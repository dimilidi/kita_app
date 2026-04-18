/** Monday–Friday buckets (indices 0–4) for dashboard attendance charts. */

export function getWeekMondayLocal(reference: Date = new Date()): Date {
  const dayOfWeek = reference.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - daysSinceMonday);
  return monday;
}

export function weekdayShortLabelsMonFri(
  lastMonday: Date,
  intlLocale: string
): string[] {
  return Array.from({ length: 5 }, (_, idx) => {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + idx);
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
    const dow = itemDate.getDay();
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
