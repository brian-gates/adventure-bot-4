import { LocationType, type Map, type Position } from "~/game/map/index.ts";

/**
 * Given a map and a position, return the location type for that position.
 */
export function locationType({
  map,
  position,
}: {
  map: Map;
  position: Position;
}) {
  // top most position is always the boss
  if (position.row === map.rows - 1) return LocationType.boss;
  // row before the boss is always campfire
  if (position.row === map.rows - 2) return LocationType.campfire;
  // all other positions are combat
  return LocationType.combat;
}
