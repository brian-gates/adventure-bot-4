import type {
  Location,
  Map,
  MapGenerator,
  Path,
  Position,
} from "~/game/map/index.ts";
import { LocationType } from "~/generated/prisma/client.ts";
import { locationType } from "./location-types.ts";

export const walkStrategy: MapGenerator = ({ cols, rows, random }) => {
  let map = emptyMap({ cols, rows });
  // Place boss node in the last row, centered
  const bossCol = Math.floor(cols / 2);
  const boss = createLocation({
    row: rows - 1,
    col: bossCol,
    type: LocationType.boss,
  });
  map.locations.push(boss);

  // Walk four lanes from start to finish
  const startCol = Math.floor(cols / 2);
  for (let i = 0; i < 4; i++) {
    ({ map } = walkPath({
      position: {
        row: 0,
        col: startCol,
      },
      rows: rows - 1,
      map,
      random,
    }));
  }

  map.locations = map.locations.map((l) => ({
    ...l,
    type: locationType({ map, position: { row: l.row, col: l.col } }),
  }));

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
  while (position.row < rows) {
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

function wouldCrossExistingPath({
  from,
  to,
  map,
}: {
  from: Position;
  to: Position;
  map: Map;
}) {
  // Only check for diagonal moves
  if (Math.abs(from.col - to.col) !== 1 || to.row - from.row !== 1)
    return false;
  for (const path of map.paths) {
    const [fromRow, fromCol] = path.fromLocationId.split(",").map(Number);
    const [toRow, toCol] = path.toLocationId.split(",").map(Number);
    // Only consider paths between adjacent rows and columns
    if (Math.abs(fromCol - toCol) === 1 && toRow - fromRow === 1) {
      // Check for crossing: (a->b) crosses (c->d) if they swap columns
      if (
        from.row === fromRow &&
        to.row === toRow &&
        from.col === toCol &&
        to.col === fromCol
      ) {
        return true;
      }
    }
  }
  return false;
}

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
  let initialPosition = map.locations.find(
    (loc) => loc.row === position.row && loc.col === position.col
  );
  if (!initialPosition) {
    initialPosition = createLocation({ row: position.row, col: position.col });
    map.locations.push(initialPosition);
  }

  const nextRow = position.row + 1;
  if (nextRow >= map.rows) {
    console.error("Out of bounds", { map, position, initialPosition });
    throw new Error("Out of bounds");
  }

  const possibleSteps = [
    { row: nextRow, col: position.col },
    { row: nextRow, col: position.col + 1 },
    { row: nextRow, col: position.col - 1 },
  ];
  const validNextSteps = possibleSteps.filter(
    (pos) =>
      isValidNextStep({ map, position: pos }) &&
      !wouldCrossExistingPath({ from: position, to: pos, map })
  );

  if (!validNextSteps.length) {
    logAsciiMap({ map });
    throw new Error(
      `No valid next step from ${initialPosition?.id} at ${position.row},${position.col}`
    );
  }

  const nextCol =
    validNextSteps[Math.floor(random() * validNextSteps.length)].col;

  const existingLocationAtNextStep = map.locations.find(
    (loc) => loc.row === nextRow && loc.col === nextCol
  );

  let newLocation: Location;
  if (existingLocationAtNextStep) {
    newLocation = existingLocationAtNextStep;
  } else {
    newLocation = createLocation({ row: nextRow, col: nextCol });
    map.locations.push(newLocation);
  }
  if (initialPosition?.id && newLocation.id) {
    map.paths.push(createPath(initialPosition.id, newLocation.id));
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

/**
 * given a target position and a spread, returns true if the position is reachable
 * by moving at most spread per row towards the target position
 */
export const isReachablePosition = ({
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
}) => {
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
};

export const isValidNextStep = ({
  map,
  position,
}: {
  map: Map;
  position: Position;
}) => {
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
};

export const isInCampfireCone = ({
  position,
  map,
}: {
  position: Position;
  map: Map;
}) => {
  const center = Math.floor(map.cols / 2);
  const leftCampfire = center - 2;
  const rightCampfire = center + 2;

  const stepsFromCampfire = map.rows - 2 - position.row;
  if (stepsFromCampfire < 0) return false;

  const leftBound = Math.max(0, leftCampfire - stepsFromCampfire);
  const rightBound = Math.min(map.cols - 1, rightCampfire + stepsFromCampfire);

  return position.col >= leftBound && position.col <= rightBound;
};
