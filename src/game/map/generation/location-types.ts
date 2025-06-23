import type { LocationType } from "~/generated/prisma/client.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Map, Position } from "~/game/map/index.ts";
import { GameMap } from "~/game/map/game-map.ts";

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
  // first row is always combat
  if (row === 0) {
    return "combat";
  }

  const currentLocation = map.locations.find(
    (l) => l.row === row && l.col === col,
  );

  if (!currentLocation) {
    return "combat"; // fallback
  }

  // Use GameMap utilities for cleaner sibling detection
  const gameMap = new GameMap(map);

  // Get parent locations (locations that have paths to this location)
  const parentLocations = gameMap.getPrevLocations({ id: currentLocation.id });

  // Get sibling locations (other locations that share the same parents)
  const siblingLocations = gameMap.getSiblingLocations({
    id: currentLocation.id,
  });

  // Get types of parent and sibling locations to exclude
  const parentTypes = parentLocations.map((l) => l.type);
  const siblingTypes = siblingLocations.map((l) => l.type);
  const excludedTypes = [...new Set([...parentTypes, ...siblingTypes])];

  return weightedRandom(
    {
      elite: row > 5 && !excludedTypes.includes("elite") ? 2 : 0,
      treasure: row > 5 && !excludedTypes.includes("treasure") ? 2 : 0,
      event: !excludedTypes.includes("event") ? 2 : 0,
      shop: row > 5 && !excludedTypes.includes("shop") ? 1 : 0,
      combat: excludedTypes.includes("combat") ? 1 : 2,
      campfire: row > 5 && !excludedTypes.includes("campfire") ? 1 : 0,
    },
    random,
  ) as LocationType;
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
};

// Color codes for location types
export const locationTypeColor: Record<LocationType, string> = {
  combat: "\x1b[32m", // Green
  elite: "\x1b[35m", // Magenta
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
  event: 23,
  campfire: 12,
  treasure: 10,
  shop: 5,
  elite: 5,
  boss: 5,
};
