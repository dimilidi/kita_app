import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

/**
 * DnD sensors for play/lunch boards.
 * MouseSensor handles desktop; TouchSensor handles iOS/Android (PointerSensor alone is unreliable on touch).
 * Long-press delay matches prior PointerSensor behavior and avoids accidental drags while scrolling.
 */
export function useBoardDndSensors() {
  const activationConstraint = {
    delay: 400,
    tolerance: 5,
  } as const;

  return useSensors(
    useSensor(MouseSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint })
  );
}
