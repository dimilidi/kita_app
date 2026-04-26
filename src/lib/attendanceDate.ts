/** Calendar day in YYYY-MM-DD → UTC midnight range for DB queries. */
export function parseDateStrToUtcRange(dateStr: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo - 1, d + 1, 0, 0, 0, 0));
  return { start, end };
}

export function todayDateStrLocal() {
  return new Date().toLocaleDateString("en-CA");
}

/** Same as Attendance page: `YYYY-MM-DD` or today (local). */
export function normalizeAttendanceDateStr(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return todayDateStrLocal();
  }
  // Clamp weekends to a working day so routes never "land" on Sat/Sun.
  // - Saturday → Friday
  // - Sunday → Monday
  const range = parseDateStrToUtcRange(value);
  if (!range) return todayDateStrLocal();
  const d = range.start;
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function isWeekendDateStrUTC(dateStr: string): boolean {
  const range = parseDateStrToUtcRange(dateStr);
  if (!range) return false;
  const dow = range.start.getUTCDay(); // 0=Sun ... 6=Sat
  return dow === 0 || dow === 6;
}
