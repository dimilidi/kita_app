/**
 * THESIS DEMONSTRATION — weekend override (temporary)
 *
 * Toggle this single value to switch between demo and production behavior:
 *
 *   `true`  → Demo Mode: Saturdays and Sundays work like weekdays for
 *             attendance, date pickers, and boards.
 *   `false` → Original behavior: weekends blocked for attendance; weekend
 *             URLs redirect to the nearest weekday.
 *
 * After the thesis defense, set to `false` (or delete this file and revert
 * the two THESIS DEMO hooks in `attendanceDate.ts` and `WorkingDayDatePicker.tsx`).
 */
export const THESIS_DEMO_WEEKENDS_ENABLED = true;
