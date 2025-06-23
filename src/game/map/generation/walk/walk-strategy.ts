import {
  type Location,
  type Map,
  type Path,
  type Position,
} from "~/game/map/index.ts";
import { locationType } from "../location-types.ts";
import { canReachTargetFromPosition } from "./can-reach-target-from-position.ts";

export const walkStrategy = ({
  cols = 7,
  rows = 15,
  numPaths = 5,
  random = Math.random,
  onStep,
}: {
  cols?: number;
  rows?: number;
  numPaths?: number;
  random: () => number;
  onStep?: (map: Map) => void;
}) => {
  let map = emptyMap({ cols, rows });
  const locMap = new Map<string, Location>();

  function getOrCreateLocation(row: number, col: number): Location {
    const key = `${row},${col}`;
    let loc = locMap.get(key);
    if (!loc) {
      loc = createLocationSimple({ row, col, map });
      locMap.set(key, loc);
    }
    return loc;
  }

  const centerCol = Math.floor(cols / 2);
  const boss = getOrCreateLocation(rows - 1, centerCol);
  const start = { row: 0, col: centerCol };

  map.locations = [boss];
  for (let i = 0; i < numPaths; i++) {
    ({ map } = walkPath({
      position: i === 1 ? boss : start,
      map,
      random,
      avoidOccupied: i === 1,
      onStep,
      getOrCreateLocation,
      target: i === 1 ? start : boss,
    }));
  }

  map.locations = Array.from(locMap.values());

  // Now reassign location types based on the complete path structure
  // Process row by row from top to bottom to ensure proper traversal order
  const visited = new Set<string>();

  // Sort locations by row, then by col for consistent ordering
  const sortedLocations = [...map.locations].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Process each location in row-by-row order
  for (const location of sortedLocations) {
    if (!visited.has(location.id)) {
      location.type = locationType({
        map,
        position: { row: location.row, col: location.col },
        random,
      });
      visited.add(location.id);
    }
  }

  const locationIds = new Set(map.locations.map((l) => l.id));
  const allPathEndpointIds = map.paths.flatMap((
    p,
  ) => [p.fromLocationId, p.toLocationId]);
  const missing = allPathEndpointIds.filter((id) => !locationIds.has(id));
  if (missing.length > 0) {
    throw new Error(
      `walkStrategy: Missing location IDs for paths: ${
        [...new Set(missing)].join(", ")
      }`,
    );
  }
  return map;
};

function walkPath({
  position: initialPosition,
  map: initialMap,
  random,
  onStep,
  avoidOccupied = false,
  getOrCreateLocation,
  target,
}: {
  position: Position;
  map: Map;
  random: () => number;
  onStep?: (map: Map) => void;
  avoidOccupied?: boolean;
  getOrCreateLocation: (row: number, col: number) => Location;
  target: { row: number; col: number };
}): { position: Position; map: Map } {
  let map = structuredClone(initialMap);
  let position = structuredClone(initialPosition);
  while (position.row !== target.row) {
    ({ map, position } = step({
      map,
      position,
      random,
      onStep,
      avoidOccupied,
      getOrCreateLocation,
      target,
    }));
  }
  return { position, map };
}

export function emptyMap({
  cols = 7,
  rows = 15,
}: {
  cols: number;
  rows: number;
}): Map {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    locations: [],
    paths: [],
    cols,
    rows,
    createdAt: now,
    updatedAt: now,
    guildId: null,
    guild: null,
  };
}

export function wouldCrossExistingPath({
  from,
  to,
  map,
}: {
  from: Position;
  to: Position;
  map: Map;
}) {
  if (Math.abs(from.col - to.col) !== 1 || to.row - from.row !== 1) {
    return false;
  }

  const colOffset = to.col > from.col ? 1 : -1;
  // The two nodes that would form a crossing path
  const nodeA = map.locations.find(
    (loc) => loc.row === from.row && loc.col === from.col + colOffset,
  );
  const nodeB = map.locations.find(
    (loc) => loc.row === to.row && loc.col === from.col,
  );
  if (!nodeA || !nodeB) return false;
  return !!map.paths.find(
    (path) =>
      (path.fromLocationId === nodeA.id && path.toLocationId === nodeB.id) ||
      (path.fromLocationId === nodeB.id && path.toLocationId === nodeA.id),
  );
}

function step({
  map: initialMap,
  position,
  random,
  onStep,
  avoidOccupied = false,
  getOrCreateLocation,
  target,
}: {
  map: Map;
  position: Position;
  random: () => number;
  onStep?: (map: Map) => void;
  avoidOccupied?: boolean;
  getOrCreateLocation: (row: number, col: number) => Location;
  target: Position;
}) {
  const map = structuredClone(initialMap);
  const fromLocation = getOrCreateLocation(position.row, position.col);
  if (!map.locations.find((l) => l.id === fromLocation.id)) {
    map.locations.push(fromLocation);
  }
  const nextRow = position.row + (target.row > position.row ? 1 : -1);
  if (nextRow < 0 || nextRow >= map.rows) {
    throw new Error("Out of bounds");
  }
  const initialSteps = [
    { row: nextRow, col: position.col },
    { row: nextRow, col: position.col + 1 },
    { row: nextRow, col: position.col - 1 },
  ];
  // Only allow steps within bounds
  const boundedSteps = initialSteps.filter((pos) =>
    pos.col >= 0 && pos.col < map.cols && pos.row >= 0 && pos.row < map.rows
  );
  let possibleSteps = boundedSteps.filter((position) => {
    return canReachTargetFromPosition({
      position,
      target,
    }) && !wouldCrossExistingPath({
      from: fromLocation.row < position.row ? fromLocation : position,
      to: fromLocation.row < position.row ? position : fromLocation,
      map,
    });
  });
  if (avoidOccupied) {
    const occupiedCols = map.locations.filter((l) => l.row === nextRow).map((
      l,
    ) => l.col);
    const notOccupied = possibleSteps.filter((pos) =>
      !occupiedCols.includes(pos.col)
    );
    if (notOccupied.length > 0) {
      possibleSteps = notOccupied;
    }
  }
  const nextRowNodes = map.locations.filter((l) => l.row === nextRow);
  if (nextRowNodes.length === 1 && possibleSteps.length > 1) {
    const occupiedCol = nextRowNodes[0].col;
    const altSteps = possibleSteps.filter((pos) => pos.col !== occupiedCol);
    if (altSteps.length > 0) {
      possibleSteps = altSteps;
    }
  }
  if (!possibleSteps.length) {
    throw new Error(
      `No valid next step from ${fromLocation?.id} at ${position.row},${position.col}`,
    );
  }
  const nextCol =
    possibleSteps[Math.floor(random() * possibleSteps.length)].col;
  const toLocation = getOrCreateLocation(nextRow, nextCol);
  if (!map.locations.find((l) => l.id === toLocation.id)) {
    map.locations.push(toLocation);
  }

  map.paths.push(
    createPath({
      fromLocationId: fromLocation.row < toLocation.row
        ? fromLocation.id
        : toLocation.id,
      toLocationId: fromLocation.row < toLocation.row
        ? toLocation.id
        : fromLocation.id,
      mapId: map.id,
    }),
  );
  if (onStep) onStep(map);
  return {
    map,
    position: { row: nextRow, col: nextCol },
  };
}

function createLocationSimple({
  row,
  col,
  map,
}: {
  row: number;
  col: number;
  map: Map;
}): Location {
  return {
    id: crypto.randomUUID(),
    mapId: map.id,
    name: `Location ${row}, ${col}`,
    description: `A location at ${row}, ${col}`,
    row,
    col,
    type: "combat",
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createPath({
  fromLocationId,
  toLocationId,
  mapId,
}: {
  fromLocationId: string;
  toLocationId: string;
  mapId: string;
}): Path {
  return {
    id: crypto.randomUUID(),
    mapId,
    fromLocationId,
    toLocationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: "Path from " + fromLocationId + " to " + toLocationId,
    attributes: {},
  };
}
