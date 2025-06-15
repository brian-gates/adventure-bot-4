import type { Position } from "~/game/map/index.ts";

/**
 * Determine if the target can be reached from the position by moving
 * diagonally.
 */
export function canReachTargetFromPosition({
  target,
  position,
}: {
  target: Position;
  position: Position;
}) {
  const xDistance = Math.abs(position.col - target.col);
  const yDistance = Math.abs(position.row - target.row);
  return xDistance <= yDistance;
}
