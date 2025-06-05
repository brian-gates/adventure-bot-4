import type { Location } from "~/generated/prisma/client.ts"; // Path might be needed if we generate paths
import { LocationType } from "~/generated/prisma/client.ts"; // Enum for LocationType
import type { Map, MapGenerator } from "./index.ts";

export const walkStrategy: MapGenerator = ({ cols, rows, random }) => {
  const initialMap = emptyMap({ cols, rows });
  const mapWithPath = addPath({ map: initialMap, random });
  return mapWithPath;
};

export function emptyMap({ cols, rows }: { cols: number; rows: number }): Map {
  return {
    locations: [],
    paths: [],
    cols,
    rows,
  };
}

function startingLocation(map: Map) {
  return {
    row: 0,
    col: Math.floor(map.cols / 2),
  };
}

export function addPath({
  map,
  random,
}: {
  map: Map;
  random: () => number;
}): Map {
  const startPos = startingLocation(map);
  const endPos = { row: map.rows - 1, col: Math.floor(map.cols / 2) };

  const pathPositions = randomWalk({
    start: startPos,
    end: endPos,
    numRows: map.rows,
    numCols: map.cols,
    random,
  });

  const pathLocations: Location[] = pathPositions.map((pos, index) => ({
    id: `pathloc_${map.locations.length + index}_${pos.row}_${pos.col}`,
    channelId: "placeholder_channel_id",
    row: pos.row,
    col: pos.col,
    type: LocationType.combat,
    name: `Combat ${pos.row},${pos.col}`,
    description: "A combat encounter.",
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const combinedLocations = [...map.locations];
  pathLocations.forEach((newLoc) => {
    const existingIndex = combinedLocations.findIndex(
      (l) => l.row === newLoc.row && l.col === newLoc.col
    );
    if (existingIndex !== -1) {
      combinedLocations[existingIndex] = newLoc; // Replace if exists at same spot
    } else {
      combinedLocations.push(newLoc); // Add if new spot
    }
  });

  return {
    ...map, // Spreads original cols, rows, and paths
    locations: combinedLocations,
    // paths: generated paths if randomWalk also creates Path objects
  };
}

type Position = {
  row: number;
  col: number;
};

// randomWalk needs to be aware of map boundaries
function randomWalk({
  start,
  end,
  numRows,
  numCols,
  random,
}: {
  start: Position;
  end: Position;
  numRows: number;
  numCols: number;
  random: () => number;
}): Position[] {
  const path: Position[] = [];
  let current = { ...start };
  path.push({ ...start });

  let iterations = 0;
  // A more sensible maxIterations might be numRows * numCols to avoid overly long/stuck paths.
  const maxIterations = numRows * numCols * 2;

  while (
    (current.row !== end.row || current.col !== end.col) &&
    iterations < maxIterations
  ) {
    const prevPos = { ...current };

    // Prioritize moving towards the end row
    if (current.row !== end.row) {
      current.row += end.row > current.row ? 1 : -1;
    } else if (current.col !== end.col) {
      // Then move towards the end col
      current.col += end.col > current.col ? 1 : -1;
    }

    // Boundary checks (simple clamp)
    current.row = Math.max(0, Math.min(numRows - 1, current.row));
    current.col = Math.max(0, Math.min(numCols - 1, current.col));

    // Avoid getting stuck in the same spot if movement was clamped or no change happened
    if (
      current.row === prevPos.row &&
      current.col === prevPos.col &&
      (current.row !== end.row || current.col !== end.col)
    ) {
      // If stuck, try a random move as a fallback, prioritizing overall direction
      const randomMove = Math.random();
      if (randomMove < 0.33 && current.row !== end.row) {
        current.row += end.row > current.row ? 1 : -1;
      } else if (randomMove < 0.66 && current.col !== end.col) {
        current.col += end.col > current.col ? 1 : -1;
      } else {
        // Try a small nudge if still stuck
        if (Math.random() > 0.5) current.row += Math.random() > 0.5 ? 1 : -1;
        else current.col += Math.random() > 0.5 ? 1 : -1;
        current.row = Math.max(0, Math.min(numRows - 1, current.row));
        current.col = Math.max(0, Math.min(numCols - 1, current.col));
      }
    }

    // Only add to path if it's a new position to avoid duplicates from being stuck
    if (
      path.length === 0 ||
      path[path.length - 1].row !== current.row ||
      path[path.length - 1].col !== current.col
    ) {
      path.push({ ...current });
    }

    iterations++;
  }

  if (
    iterations >= maxIterations &&
    (current.row !== end.row || current.col !== end.col)
  ) {
    // console.warn("randomWalk: Max iterations. Path may be incomplete. Forcing to end.");
    // Ensure the end point is part of the path if not reached
    if (
      path[path.length - 1].row !== end.row ||
      path[path.length - 1].col !== end.col
    ) {
      path.push({ ...end });
    }
  }
  return path;
}
