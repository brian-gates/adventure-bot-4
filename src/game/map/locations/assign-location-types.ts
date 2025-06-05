import { Location, Path } from "~/generated/prisma/client.ts";
import { LocationType } from "~/generated/prisma/enums.ts";
import { groupBy } from "~/util/group-by.ts";
import { seededRandom } from "../../seeded-random.ts";

type AssignMap = Readonly<Record<string, LocationType | "boss" | "campfire">>;

type RandFn = () => number;

function assignElites({
  assign,
  byRow,
  rows,
  rand,
}: {
  assign: AssignMap;
  byRow: Readonly<Map<number, Readonly<Location[]>>>;
  rows: Readonly<number[]>;
  rand: RandFn;
}): AssignMap {
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  const availableForElite = rows.filter(
    (r) => r !== firstRow && r !== lastRow && r !== rows[1]
  );
  // Simple random placement for now
  const eliteRowIndex = Math.floor(rand() * availableForElite.length);
  const eliteRow = availableForElite[eliteRowIndex];
  if (eliteRow !== undefined) {
    const rowNodes = byRow.get(eliteRow);
    if (rowNodes && rowNodes.length > 0) {
      const eliteNode = rowNodes[Math.floor(rand() * rowNodes.length)];
      if (eliteNode) return { ...assign, [eliteNode.id]: "elite" };
    }
  }
  return assign; // Return original if no assignment made
}

function assignEvents({
  assign,
  byRow,
  rows,
  restRows,
  rand,
}: {
  assign: AssignMap;
  byRow: Readonly<Map<number, Readonly<Location[]>>>;
  rows: Readonly<number[]>;
  restRows: Readonly<number[]>;
  rand: RandFn;
}): AssignMap {
  let nextAssign = { ...assign }; // Use a temporary mutable copy within the function
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  const availableForEvent = rows.filter(
    (r) => r !== firstRow && r !== lastRow && !restRows.includes(r)
  );

  for (const r of availableForEvent) {
    const rowNodes =
      byRow.get(r)?.filter((n: Location) => !nextAssign[n.id]) ?? [];
    if (!rowNodes.length) continue;

    const prev =
      byRow.get(r - 1)?.filter((n: Location) => nextAssign[n.id] === "event") ??
      [];
    const next =
      byRow.get(r + 1)?.filter((n: Location) => nextAssign[n.id] === "event") ??
      [];

    if (
      rowNodes.length === 2 &&
      rowNodes.every((n: Location) => nextAssign[n.id] === undefined)
    ) {
      if (!prev.length && !next.length) {
        const idx = Math.floor(rand() * rowNodes.length);
        nextAssign = { ...nextAssign, [rowNodes[idx].id]: "event" };
      }
    } else {
      if (!prev.length && !next.length) {
        const idx = Math.floor(rand() * rowNodes.length);
        nextAssign = { ...nextAssign, [rowNodes[idx].id]: "event" };
      }
    }
  }
  return nextAssign; // Return the modified copy
}

function assignCampfireAndTavern({
  assign,
  byRow,
  rows,
}: {
  assign: AssignMap;
  byRow: Map<number, Location[]>;
  rows: number[];
  rand: RandFn;
}): AssignMap {
  const updatedMap = { ...assign };
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  const preBossRow = rows[rows.length - 2];
  const midRow = rows[Math.floor(rows.length / 2)];

  // Assign Campfire to pre-boss row if exists and has nodes
  const preBossNodes = byRow.get(preBossRow);
  if (preBossNodes && preBossNodes.length > 0) {
    for (const node of preBossNodes) {
      if (updatedMap[node.id] === undefined) {
        updatedMap[node.id] = "campfire";
        break; // Assign campfire to one node in pre-boss row
      }
    }
  }

  // Assign Tavern
  let tavernAssigned = false;
  const availableForTavern = rows.filter(
    (r) => r !== firstRow && r !== lastRow && r !== preBossRow
  );

  // Prioritize mid-row, then check others
  const rowsToCheck = [
    midRow,
    ...availableForTavern.filter((r) => r !== midRow),
  ];

  for (const r of rowsToCheck) {
    const rowNodes = byRow.get(r);
    const prevRowNodes = byRow.get(r - 1) || [];
    const hasEliteInPrevRow = prevRowNodes.some(
      (node) => updatedMap[node.id] === "elite"
    );

    if (
      rowNodes &&
      rowNodes.length > 0 &&
      !hasEliteInPrevRow &&
      rowNodes.some((node) => updatedMap[node.id] === undefined) // Check if any node is available
    ) {
      for (const node of rowNodes) {
        if (updatedMap[node.id] === undefined) {
          updatedMap[node.id] = "tavern";
          tavernAssigned = true;
          break; // Assign tavern and stop
        }
      }
    }
    if (tavernAssigned) break; // Stop checking rows once tavern is assigned
  }

  return updatedMap;
}

export function assignLocationTypes(
  { locations, paths }: { locations: Location[]; paths: Path[] },
  opts: { seed?: number } = {}
) {
  const rand = seededRandom(opts.seed ?? 0);
  // Grouping by row using the immutable groupBy, result is a Map
  const byRowMap = groupBy({ arr: locations, fn: (n) => n.row });
  // Convert Map to a simple object for compatibility with existing logic (removed as helper functions now use Map)
  // const byRow = Object.fromEntries(byRowMap);
  const rows = Array.from(byRowMap.keys())
    .map(Number)
    .sort((a, b) => a - b);

  let assign: AssignMap = {}; // Start with an empty assignment map

  // Ensure first row has combat node(s)
  const firstRow = rows[0];
  const firstRowNodes = byRowMap.get(firstRow);
  if (firstRowNodes && firstRowNodes.length > 0) {
    assign = {
      ...assign,
      ...Object.fromEntries(firstRowNodes.map((node) => [node.id, "combat"])),
    };
  }

  // Ensure last row has a boss node(s)
  const lastRow = rows[rows.length - 1];
  const lastRowNodes = byRowMap.get(lastRow);
  if (lastRowNodes && lastRowNodes.length > 0) {
    assign = {
      ...assign,
      ...Object.fromEntries(lastRowNodes.map((node) => [node.id, "boss"])),
    };
  }

  // Chain the immutable assignment function calls, passing the Map
  assign = assignElites({ assign, byRow: byRowMap, rows, rand });
  assign = assignCampfireAndTavern({ assign, byRow: byRowMap, rows, rand });

  const restRows = [
    rows[rows.length - 2],
    rows[Math.floor(rows.length / 2)],
  ].filter((r) => r !== firstRow && r !== lastRow);
  assign = assignEvents({ assign, byRow: byRowMap, rows, restRows, rand });

  // Default remaining nodes to combat (this part is already mostly immutable)
  const typedLocations = locations.map((n) => ({
    ...n,
    type: assign[n.id] ?? "combat",
  }));

  return { locations: typedLocations, paths };
}
