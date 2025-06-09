import { strategies } from "~/game/map/generation/index.ts";
import type { Location, Map } from "~/game/map/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";

function testMap(
  { locations, paths, cols, rows }: Map,
  { minNodes, maxNodes }: { minNodes: number; maxNodes: number },
) {
  const errors: string[] = [];
  const byRow: Record<number, Location[]> = {};
  for (const node of locations) {
    byRow[node.row] = byRow[node.row] || [];
    byRow[node.row].push(node);
  }
  if ((byRow[0]?.length ?? 0) !== 1) errors.push("First row must have 1 node");
  if ((byRow[rows - 1]?.length ?? 0) !== 1) {
    errors.push("Last row must have 1 node");
  }
  if (byRow[0] && byRow[0][0].col !== Math.floor(cols / 2)) {
    errors.push("Start node not centered");
  }
  if (byRow[rows - 1] && byRow[rows - 1][0].col !== Math.floor(cols / 2)) {
    errors.push("End node not centered");
  }
  for (let r = 1; r < rows - 1; r++) {
    const n = byRow[r]?.length ?? 0;
    if (n < minNodes || n > maxNodes) {
      errors.push(
        `Row ${r} has ${n} nodes (should be ${minNodes}-${maxNodes})`,
      );
    }
    const colsSet = new Set(byRow[r]?.map((n) => n.col));
    if (colsSet.size !== n) errors.push(`Row ${r} has duplicate columns`);
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
  return errors;
}

const configs = [{ cols: 7, rows: 15, minNodes: 2, maxNodes: 5, numPaths: 3 }];
if (import.meta.main) {
  for (const config of configs) {
    for (const { name, fn } of strategies) {
      let passCount = 0;
      let failCount = 0;

      for (let run = 1; run <= 1000; run++) {
        const map = fn({
          cols: config.cols,
          rows: config.rows,
          numPaths: config.numPaths,
          minNodes: config.minNodes,
          maxNodes: config.maxNodes,
          random: seededRandom(run),
          guildId: BigInt(1),
          onStep: () => {},
        });
        const errors = testMap(map, config);
        if (errors.length === 0) {
          passCount++;
        } else {
          failCount++;
        }
      }

      const percent = ((passCount / (passCount + failCount)) * 100).toFixed(2);
      console.log(
        `${name}: ${passCount}/${
          passCount + failCount
        } (${percent}%) success rate`,
      );
    }
  }
}

export { testMap };
