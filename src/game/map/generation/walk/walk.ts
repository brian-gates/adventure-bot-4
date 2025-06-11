import {
  type Location,
  LocationType,
  type Map,
  type MapGenerator,
  type Path,
  type Position,
} from "~/game/map/index.ts";
import { logAsciiMap } from "../log-ascii-map.ts";
import { locationType } from "./location-types.ts";

export const walkStrategy: MapGenerator = ({
  cols = 7,
  rows = 15,
  numPaths = 5,
  random = Math.random,
  onStep,
}) => {
  let map = emptyMap({ cols, rows });
  const boss = createLocation({
    row: rows - 1,
    col: Math.floor(cols / 2),
    random,
    map,
  });
  map.locations = [...(map.locations ?? []), boss];

  const startCol = Math.floor(cols / 2);

  for (let i = 1; i < numPaths; i++) {
    ({ map } = walkPath({
      position: { row: 0, col: startCol },
      rows: rows - 1,
      map,
      random,
      avoidOccupied: i == 2, // try to create at least two exclusive paths
      onStep,
    }));
  }


  return map;
};

function walkPath({
  position: initialPosition,
  rows,
  map: initialMap,
  random,
  onStep,
  recordCols,
  avoidOccupied,
}: {
  position: Position;
  rows: number;
  map: Map;
  random: () => number;
  onStep?: (map: Map) => void;
  recordCols?: number[];
  avoidOccupied?: boolean;
}): { position: Position; map: Map } {
  let map = structuredClone(initialMap);
  let position = structuredClone(initialPosition);
  if (onStep) onStep(map);
  while (position.row < rows) {
    ({ map, position } = step({
      map,
      position,
      random,
      onStep,
      avoidOccupied,
    }));
    if (recordCols) {
      recordCols[position.row] = position.col;
    }
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
    currentLocationId: null,
    locationId: null,
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
  avoidOccupied,
}: {
  map: Map;
  position: Position;
  random: () => number;
  onStep?: (map: Map) => void;
  avoidOccupied?: boolean;
}) {
  const map = structuredClone(initialMap);
  let initialPosition = map.locations.find(
    (loc) => loc.row === position.row && loc.col === position.col,
  );
  if (!initialPosition) {
    initialPosition = createLocation({
      row: position.row,
      col: position.col,
      random,
      map,
    });
    map.locations.push(initialPosition);
  }

  const nextRow = position.row + 1;
  if (nextRow >= map.rows) {
    throw new Error("Out of bounds");
  }

  let possibleSteps = [
    { row: nextRow, col: position.col },
    { row: nextRow, col: position.col + 1 },
    { row: nextRow, col: position.col - 1 },
  ].filter(
    (pos) =>
      isValidNextStep({ map, position: pos }) &&
      !wouldCrossExistingPath({ from: initialPosition, to: pos, map })
  );

  if (avoidOccupied) {
    const occupiedCols = map.locations.filter((l) => l.row === nextRow).map((l) => l.col);
    const notOccupied = possibleSteps.filter((pos) => !occupiedCols.includes(pos.col));
    if (notOccupied.length > 0) {
      possibleSteps = notOccupied;
    }
  }

  // Enforce at least two lanes per row
  const nextRowNodes = map.locations.filter((l) => l.row === nextRow);
  if (nextRowNodes.length === 1 && possibleSteps.length > 1) {
    const occupiedCol = nextRowNodes[0].col;
    const altSteps = possibleSteps.filter((pos) => pos.col !== occupiedCol);
    if (altSteps.length > 0) {
      possibleSteps = altSteps;
    }
  }

  if (!possibleSteps.length) {
    logAsciiMap({ map });
    throw new Error(
      `No valid next step from ${initialPosition?.id} at ${position.row},${position.col}`,
    );
  }

  const nextCol =
    possibleSteps[Math.floor(random() * possibleSteps.length)].col;

  const existingLocationAtNextStep = map.locations.find(
    (loc) => loc.row === nextRow && loc.col === nextCol,
  );

  let newLocation: Location;
  if (existingLocationAtNextStep) {
    newLocation = existingLocationAtNextStep;
  } else {
    newLocation = createLocation({
      row: nextRow,
      col: nextCol,
      random,
      map,
    });
    map.locations.push(newLocation);
  }
  if (initialPosition?.id && newLocation.id) {
    map.paths.push(
      createPath({
        fromLocationId: initialPosition.id,
        toLocationId: newLocation.id,
        mapId: map.id,
      }),
    );
  }

  if (onStep) onStep(map);
  return {
    map,
    position: { row: nextRow, col: nextCol },
  };
}

function createLocation({
  row,
  col,
  map,
  random,
}: {
  row: number;
  col: number;
  random: () => number;
  map: Map;
}): Location {
  return {
    id: crypto.randomUUID(),
    mapId: map.id,
    name: `Location ${row}, ${col}`,
    description: `A location at ${row}, ${col}`,
    row,
    col,
    type: locationType({
      map,
      position: { row, col },
      random,
    }),
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

/**
 * given a target position and a spread, returns true if the position is reachable
 * by moving at most spread per row towards the target position
 */
export function isReachablePosition({
  row,
  col,
  targetRow,
  targetCols,
  spread = 1,
  rows,
  cols,
}: {
  row: number;
  col: number;
  targetRow: number;
  targetCols: number[];
  spread?: number;
  rows: number;
  cols: number;
}) {
  if (row < 0 || row >= rows) return false;
  if (col < 0 || col >= cols) return false;
  for (const tCol of targetCols) {
    const steps = targetRow - row;
    if (steps < 0) continue;
    if (Math.abs(tCol - col) <= steps * spread) {
      return true;
    }
  }
  return false;
}

export function isValidNextStep({
  map,
  position,
}: {
  map: Map;
  position: Position;
}) {
  // Use the boss as the target
  const boss = map.locations.find((l) => l.type === LocationType.boss);
  if (!boss) return false;
  if (
    !isReachablePosition({
      row: position.row,
      col: position.col,
      rows: map.rows,
      cols: map.cols,
      targetRow: boss.row,
      targetCols: [boss.col],
      spread: 1,
    })
  ) {
    return false;
  }
  if (position.row < 0 || position.row >= map.rows) {
    return false;
  }
  if (position.col < 0 || position.col >= map.cols) {
    return false;
  }
  return true;
}
