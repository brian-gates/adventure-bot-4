import { LocationType, type Map, type Position } from "~/game/map/index.ts";
import { weightedRandom } from "~/game/weighted-random.ts";

/**
 * Given a map and a position, return the location type for that position.
 */
export function locationType({
  map,
  position,
  random,
}: {
  map: Map;
  position: Position;
  random: () => number;
}) {
  const { row, col } = position;
  // top most position is always the boss
  if (row === map.rows - 1) {
    return LocationType.boss;
  }

  // row before the boss is always campfire
  if (row === map.rows - 2) {
    return LocationType.campfire;
  }

  // taverns in the middle
  if (row === Math.floor(map.rows / 2)) {
    return LocationType.tavern;
  }

  // first row is always combat
  if (row === 0) {
    return LocationType.combat;
  }

  const currentLocation = map.locations.find(
    (l) => l.row === row && l.col === col,
  );
  const preceedingPaths = map.paths.filter(
    (p) => p.toLocationId === currentLocation?.id,
  );
  const preceedingLocations = map.locations.filter((l) =>
    preceedingPaths.some((p) => p.fromLocationId === l.id)
  );
  const preceedingLocationTypes = preceedingLocations.map((l) => l.type);

  return weightedRandom(
    {
      [LocationType.elite]:
        row <= 5 && preceedingLocationTypes.includes(LocationType.elite)
          ? 0
          : 1,
      [LocationType.treasure]:
        row <= 5 && preceedingLocationTypes.includes(LocationType.treasure)
          ? 0
          : 2,
      [LocationType.event]: preceedingLocationTypes.includes(LocationType.event)
        ? 1
        : 3,
      [LocationType.shop]:
        row <= 5 && preceedingLocationTypes.includes(LocationType.shop) ? 0 : 1,
      [LocationType.combat]: row === 0
        ? 0
        : preceedingLocationTypes.includes(LocationType.combat)
        ? 2
        : 4,
      [LocationType.campfire]:
        row > 5 && preceedingLocationTypes.includes(LocationType.campfire)
          ? 1
          : 0,
    },
    random,
  );
}
