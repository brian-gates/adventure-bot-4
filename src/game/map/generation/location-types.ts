import type { LocationType } from "~/generated/prisma/client.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Map, Position } from "~/game/map/index.ts";

/**
 * Context-aware location type assignment for in-game map generation.
 * Uses map structure, adjacency, and other constraints.
 */
export function locationType({
  map,
  position,
  random,
}: {
  map: Map;
  position: Position;
  random: () => number;
}): LocationType {
  const { row, col } = position;
  // top most position is always the boss
  if (row === map.rows - 1) {
    return "boss";
  }
  // row before the boss is always campfire
  if (row === map.rows - 2) {
    return "campfire";
  }
  // taverns in the middle
  if (row === Math.floor(map.rows / 2)) {
    return "tavern";
  }
  // first row is always combat
  if (row === 0) {
    return "combat";
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
      elite: row > 5 && !preceedingLocationTypes.includes("elite") ? 1 : 0,
      treasure: row > 5 && !preceedingLocationTypes.includes("treasure")
        ? 2
        : 0,
      event: !preceedingLocationTypes.includes("event") ? 1 : 0,
      shop: row > 5 && !preceedingLocationTypes.includes("shop") ? 1 : 0,
      combat: preceedingLocationTypes.includes("combat") ? 2 : 3,
      campfire: row > 5 && !preceedingLocationTypes.includes("campfire")
        ? 1
        : 0,
    },
    random,
  ) as LocationType;
}

/**
 * Simple weighted random location type generator for statistical analysis/testing only.
 * Does not consider map structure or adjacency.
 */
export function generateLocationType(random: () => number): LocationType {
  const weights: Record<LocationType, number> = {
    combat: 40,
    event: 15,
    campfire: 12,
    treasure: 10,
    tavern: 8,
    shop: 5,
    elite: 5,
    boss: 5,
  };
  return weightedRandom(weights, random);
}

// Legend mapping for location types
export const locationSymbols: Record<LocationType, string> = {
  combat: "X",
  treasure: "$",
  event: "?",
  elite: "E",
  boss: "B",
  campfire: "C",
  shop: "S",
  tavern: "T",
};

// Color codes for location types
export const locationTypeColor: Record<LocationType, string> = {
  combat: "\x1b[32m", // Green
  elite: "\x1b[35m", // Magenta
  tavern: "\x1b[36m", // Cyan
  treasure: "\x1b[33m", // Yellow
  event: "\x1b[34m", // Blue
  boss: "\x1b[31m", // Red
  campfire: "\x1b[37m", // White
  shop: "\x1b[90m", // Bright Black (Gray)
};

export const resetColor = "\x1b[0m";

// Location type weights for generation
export const locationTypeWeights: Record<LocationType, number> = {
  combat: 40,
  event: 15,
  campfire: 12,
  treasure: 10,
  tavern: 8,
  shop: 5,
  elite: 5,
  boss: 5,
};
