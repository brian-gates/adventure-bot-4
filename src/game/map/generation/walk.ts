import { LocationType } from "~/generated/prisma/client.ts";
import type { Location, Map, MapGenerator, Path } from "./index.ts";

export const walkStrategy: MapGenerator = ({ cols, rows, random }) => {
  let map = emptyMap({ cols, rows });
  const startingPosition = startingLocation(map);

  for (let i = 0; i < 1; i++) {
    let position = { row: startingPosition.row + 1, col: startingPosition.col };
    ({ position, map } = walkPath({ position, rows, map, random }));
  }
  return map;
};

function walkPath({
  position: initialPosition,
  rows,
  map: initialMap,
  random,
}: {
  position: Position;
  rows: number;
  map: Map;
  random: () => number;
}): { position: Position; map: Map } {
  let map = structuredClone(initialMap);
  let position = structuredClone(initialPosition);
  while (position.row < rows - 3) {
    ({ map, position } = step({ map, position, random }));
  }
  return { position, map };
}

export function emptyMap({ cols, rows }: { cols: number; rows: number }): Map {
  return {
    locations: [],
    paths: [],
    cols,
    rows,
  };
}

function startingLocation(map: Map): Position {
  return {
    row: 0,
    col: Math.floor(map.cols / 2),
  };
}

type Position = {
  row: number;
  col: number;
};

function step({
  map: initialMap,
  position,
  random,
}: {
  map: Map;
  position: Position;
  random: () => number;
}) {
  const map = structuredClone(initialMap);
  const previousLocation = map.locations.find(
    (loc) => loc.row === position.row && loc.col === position.col
  );
  const previousLocationId = previousLocation?.id;

  // Determine next row (always try to move up)
  const nextRow = position.row + 1;
  if (nextRow >= map.rows) {
    console.error("Out of bounds", { map, position, previousLocationId });
    return { map, position: position, previousLocationId };
  }

  // Determine next column (slight horizontal variation)
  // random() gives 0 to 1. Options: -1 (left), 0 (straight), 1 (right)
  const colOffset = Math.floor(random() * 3) - 1;
  let nextCol = position.col + colOffset;

  // Keep column in bounds
  if (nextCol < 0) {
    nextCol = 0;
  }
  if (nextCol >= map.cols) {
    nextCol = map.cols - 1;
  }

  // Check if a location already exists at nextPosition (simple check)
  // For a single path, this is less critical, but good for future
  const existingLocationAtNextStep = map.locations.find(
    (loc) => loc.row === nextRow && loc.col === nextCol
  );

  let newLocation: Location;
  if (existingLocationAtNextStep) {
    newLocation = existingLocationAtNextStep; // Link to existing if somehow one is there
  } else {
    newLocation = createLocation({ row: nextRow, col: nextCol });
    map.locations.push(newLocation);
  }
  if (previousLocationId && newLocation.id) {
    map.paths.push(createPath(previousLocationId, newLocation.id));
  }

  return {
    map,
    position: { row: nextRow, col: nextCol },
  };
}

function createLocation({
  row,
  col,
  type = LocationType.combat,
  channelId = "default",
}: {
  row: number;
  col: number;
  type?: LocationType;
  channelId?: string;
}): Location {
  return {
    id: `${row}, ${col}`,
    channelId,
    name: `Location ${row}, ${col}`,
    description: `A location at ${row}, ${col}`,
    row,
    col,
    type,
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createPath(
  fromLocationId: string,
  toLocationId: string,
  channelId: string = "default"
): Path {
  return {
    id: `${fromLocationId} ➡️ ${toLocationId}`,
    channelId,
    fromLocationId,
    toLocationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: "Path from " + fromLocationId + " to " + toLocationId,
    attributes: {},
  };
}
