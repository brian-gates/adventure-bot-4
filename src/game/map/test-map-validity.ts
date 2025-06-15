import { walkStrategy } from "~/game/map/generation/walk/walk-strategy.ts";
import type { Location, Map } from "~/game/map/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";

function testMap(
  { locations, paths, cols, rows }: Map,
  { minNodes, maxNodes }: { minNodes: number; maxNodes: number },
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byRow: Record<number, Location[]> = {};
  for (const node of locations) {
    byRow[node.row] = byRow[node.row] || [];
    byRow[node.row].push(node);
  }
  // Check for out-of-bounds nodes
  for (const node of locations) {
    if (node.row < 0 || node.row >= rows || node.col < 0 || node.col >= cols) {
      errors.push(`Node at (${node.row},${node.col}) is out of bounds`);
    }
  }
  if ((byRow[0]?.length ?? 0) !== 1) {
    warnings.push("First row must have 1 node");
  }
  if ((byRow[rows - 1]?.length ?? 0) !== 1) {
    warnings.push("Last row must have 1 node");
  }
  if (byRow[0] && byRow[0][0].col !== Math.floor(cols / 2)) {
    warnings.push("Start node not centered");
  }
  if (byRow[rows - 1] && byRow[rows - 1][0].col !== Math.floor(cols / 2)) {
    warnings.push("End node not centered");
  }
  for (let r = 1; r < rows - 1; r++) {
    const n = byRow[r]?.length ?? 0;
    if (n < minNodes || n > maxNodes) {
      warnings.push(
        `Row ${r} has ${n} nodes (should be ${minNodes}-${maxNodes})`,
      );
    }
    const colsSet = new Set(byRow[r]?.map((n) => n.col));
    if (colsSet.size !== n) warnings.push(`Row ${r} has duplicate columns`);
  }
  const nodeById: Record<string, Location> = {};
  for (const n of locations) nodeById[n.id ?? `${n.row},${n.col}`] = n;
  for (const path of paths) {
    let from, to;
    if (path.fromLocationId && path.toLocationId) {
      from = nodeById[path.fromLocationId];
      to = nodeById[path.toLocationId];
    }
    if (!from || !to) {
      errors.push(
        `Invalid edge from ${
          "from" in path ? path.from : path.fromLocationId
        } to ${"to" in path ? path.to : path.toLocationId}`,
      );
    }
    if (to && from && to.row !== from.row + 1) {
      errors.push(
        `Edge from row ${from.row} to ${to.row} (should be to next row)`,
      );
    }
    if (to && from && Math.abs(to.col - from.col) > 1) {
      errors.push(
        `Edge from col ${from.col} to ${to.col} (should be adjacent)`,
      );
    }
  }
  const incoming: Record<string, number> = {};
  const outgoing: Record<string, number> = {};
  for (const path of paths) {
    let fromId, toId;
    if (path.fromLocationId && path.toLocationId) {
      fromId = path.fromLocationId;
      toId = path.toLocationId;
    }
    if (fromId) outgoing[fromId] = (outgoing[fromId] || 0) + 1;
    if (toId) incoming[toId] = (incoming[toId] || 0) + 1;
  }
  for (const node of locations) {
    const id = node.id ?? `${node.row},${node.col}`;
    if (node.row !== 0 && !incoming[id]) {
      errors.push(`Node ${id} has no incoming edge`);
    }
    if (node.row !== rows - 1 && !outgoing[id]) {
      errors.push(`Node ${id} has no outgoing edge`);
    }
  }
  // Check for X crossings (diagonal edge crossings) between adjacent rows
  for (let i = 0; i < paths.length; i++) {
    let from1, to1;
    if (paths[i].fromLocationId && paths[i].toLocationId) {
      from1 = nodeById[paths[i].fromLocationId];
      to1 = nodeById[paths[i].toLocationId];
    }
    if (!from1 || !to1) continue;
    for (let j = i + 1; j < paths.length; j++) {
      let from2, to2;
      if (paths[j].fromLocationId && paths[j].toLocationId) {
        from2 = nodeById[paths[j].fromLocationId];
        to2 = nodeById[paths[j].toLocationId];
      }
      if (!from2 || !to2) continue;
      // Only consider edges between the same two rows
      if (
        from1.row === from2.row &&
        to1.row === to2.row &&
        to1.row === from1.row + 1
      ) {
        // Check for crossing: (from1.col < from2.col && to1.col > to2.col) or vice versa
        if (
          (from1.col < from2.col && to1.col > to2.col) ||
          (from1.col > from2.col && to1.col < to2.col)
        ) {
          errors.push(
            `X crossing between (${from1.row},${from1.col})->(${to1.row},${to1.col}) and (${from2.row},${from2.col})->(${to2.row},${to2.col})`,
          );
        }
      }
    }
  }
  // Warning: map degenerates to a single lane (all rows have 1 node)
  let singleLane = true;
  for (let r = 0; r < rows; r++) {
    if ((byRow[r]?.length ?? 0) !== 1) {
      singleLane = false;
      break;
    }
  }
  if (singleLane) warnings.push("Map degenerates to a single lane");
  return { errors, warnings };
}

if (import.meta.main) {
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  const { cols, rows, numPaths, minNodes, maxNodes } = {
    cols: 7,
    rows: 15,
    numPaths: 3,
    minNodes: 2,
    maxNodes: 5,
  };

  for (let run = 1; run <= 1000; run++) {
    const map = walkStrategy({
      cols,
      rows,
      numPaths,
      random: seededRandom(run),
      onStep: () => {},
    });
    const { errors, warnings } = testMap(map, { minNodes, maxNodes });
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    if (warnings.length) {
      warningCount++;
    }
    if (errors.length === 0) {
      passCount++;
    } else {
      failCount++;
    }
  }

  const percent = ((passCount / (passCount + failCount)) * 100).toFixed(2);
  console.log(
    `${name}: ${passCount}/${passCount + failCount} (${percent}%) success rate`,
  );

  const errorCounts = countBy(allErrors);
  const warningCounts = countBy(allWarnings);

  const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
  const sortedWarnings = Object.entries(warningCounts).sort((a, b) =>
    b[1] - a[1]
  );

  if (sortedErrors.length) {
    console.log("\nError frequencies:");
    for (const [msg, count] of sortedErrors) {
      console.log(`${count}\t${msg}`);
    }
  }
  if (sortedWarnings.length) {
    console.log("\nWarning frequencies:");
    for (const [msg, count] of sortedWarnings) {
      console.log(`${count}\t${msg}`);
    }
  }
  console.log(`\nTotal passes: ${passCount}`);
  console.log(`Total fails: ${failCount}`);
  console.log(`Total with warnings: ${warningCount}`);
  console.log(`Unique error types: ${sortedErrors.length}`);
  console.log(`Unique warning types: ${sortedWarnings.length}`);
}

export { testMap };

function countBy(arr: string[]) {
  return arr.reduce((acc, msg) => {
    acc[msg] = (acc[msg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
