export type LunchSlotKey = "green" | "yellow" | "purple";

export function lunchSlotForLunchGroupEntity(input: {
  name?: string | null;
  color?: string | null;
}): LunchSlotKey | null {
  const name = (input.name ?? "").toLowerCase();
  const color = (input.color ?? "").toLowerCase();

  // Most robust: detect by name first.
  if (name.includes("green") || name.includes("grün")) return "green";
  if (name.includes("yellow") || name.includes("gelb")) return "yellow";
  if (name.includes("purple") || name.includes("lila") || name.includes("vio")) return "purple";

  // Fallback: detect by color hint.
  if (color.includes("green") || color.includes("grün")) return "green";
  if (color.includes("yellow") || color.includes("gelb")) return "yellow";
  if (color.includes("purple") || color.includes("lila") || color.includes("vio") || color.includes("red")) {
    // Back-compat: older configs may use "red" for the late slot.
    return "purple";
  }
  return null;
}

export function isNowWithinLunchSlot(slot: LunchSlotKey, now = new Date()): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  // Green: 11:30–12:00
  if (slot === "green") return mins >= 11 * 60 + 30 && mins < 12 * 60;
  // Yellow: 12:00–12:30
  if (slot === "yellow") return mins >= 12 * 60 && mins < 12 * 60 + 30;
  // Purple: 12:30–13:00
  return mins >= 12 * 60 + 30 && mins < 13 * 60;
}

/** Whole-day lunch service window (visual cue only, e.g. Essraum on play board). */
export function isWithinOverallLunchServiceWindow(now = new Date()): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 11 * 60 + 30 && mins < 13 * 60;
}

