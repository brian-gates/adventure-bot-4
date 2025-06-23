import { walkStrategy } from "~/game/map/generation/walk/walk-strategy.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { locationSymbols } from "~/game/map/generation/location-types.ts";
import type { Location, Map } from "~/game/map/index.ts";
import { Table } from "https://deno.land/x/cliffy@v1.0.0-rc.4/table/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";

function getNodeTypeDistribution(map: Map) {
  const distribution: Record<string, number> = {};

  for (const location of map.locations) {
    const type = location.type;
    distribution[type] = (distribution[type] || 0) + 1;
  }

  return distribution;
}

function getColorForType({ type }: { type: string }) {
  const colorMap: Record<string, (text: string) => string> = {
    combat: colors.green,
    elite: colors.magenta,
    tavern: colors.cyan,
    treasure: colors.yellow,
    event: colors.blue,
    boss: colors.red,
    campfire: colors.white,
    shop: colors.gray,
  };
  return colorMap[type] || colors.white;
}

function getPercentage({ count, total }: { count: number; total: number }) {
  return ((count / total) * 100).toFixed(1);
}

function getBar(
  { count, total, width = 20 }: {
    count: number;
    total: number;
    width?: number;
  },
) {
  return "█".repeat(Math.round((count / total) * width));
}

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

  // Distribution tracking
  const distributionStats: Record<
    string,
    { total: number; min: number; max: number; avg: number; runs: number[] }
  > = {};
  const totalNodesPerRun: number[] = [];

  const { cols, rows, numPaths, minNodes, maxNodes } = {
    cols: 7,
    rows: 15,
    numPaths: 3,
    minNodes: 2,
    maxNodes: 5,
  };

  const numRuns = 1000;
  console.log(`Running ${numRuns} map generation tests...`);

  for (let run = 1; run <= numRuns; run++) {
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

    // Track distribution metrics
    const distribution = getNodeTypeDistribution(map);
    const totalNodes = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0,
    );
    totalNodesPerRun.push(totalNodes);

    for (const [type, count] of Object.entries(distribution)) {
      if (!distributionStats[type]) {
        distributionStats[type] = {
          total: 0,
          min: count,
          max: count,
          avg: 0,
          runs: [],
        };
      }
      const stats = distributionStats[type];
      stats.total += count;
      stats.min = Math.min(stats.min, count);
      stats.max = Math.max(stats.max, count);
      stats.runs.push(count);
    }

    if (warnings.length) {
      warningCount++;
    }
    if (errors.length === 0) {
      passCount++;
    } else {
      failCount++;
    }
  }

  // Calculate averages
  for (const type in distributionStats) {
    const stats = distributionStats[type];
    stats.avg = stats.total / numRuns;
  }

  const percent = ((passCount / (passCount + failCount)) * 100).toFixed(2);
  console.log(
    `\n=== MAP VALIDATION RESULTS ===`,
  );
  console.log(
    `Success rate: ${passCount}/${passCount + failCount} (${percent}%)`,
  );
  console.log(`Total passes: ${passCount}`);
  console.log(`Total fails: ${failCount}`);
  console.log(`Total with warnings: ${warningCount}`);

  // Display distribution statistics
  console.log(`\n=== NODE TYPE DISTRIBUTION STATISTICS ===`);
  console.log(renderDistributionTable({ distributionStats, totalNodesPerRun }));

  // Total nodes statistics
  const avgTotalNodes = totalNodesPerRun.reduce((sum, count) =>
    sum + count, 0) / totalNodesPerRun.length;
  const minTotalNodes = Math.min(...totalNodesPerRun);
  const maxTotalNodes = Math.max(...totalNodesPerRun);
  console.log(
    `\nTotal nodes per map: Avg ${
      avgTotalNodes.toFixed(1)
    }, Range ${minTotalNodes}-${maxTotalNodes}`,
  );

  const errorCounts = countBy(allErrors);
  const warningCounts = countBy(allWarnings);

  const sortedErrors = Object.entries(errorCounts).sort((a, b) =>
    b[1] - a[1]
  );
  const sortedWarnings = Object.entries(warningCounts).sort((a, b) =>
    b[1] - a[1]
  );

  if (sortedErrors.length) {
    console.log("\n=== ERROR FREQUENCIES ===");
    for (const [msg, count] of sortedErrors) {
      console.log(`${count.toString().padStart(4)}\t${msg}`);
    }
  }
  if (sortedWarnings.length) {
    console.log("\n=== WARNING FREQUENCIES ===");
    for (const [msg, count] of sortedWarnings) {
      console.log(`${count.toString().padStart(4)}\t${msg}`);
    }
  }

  console.log(`\nUnique error types: ${sortedErrors.length}`);
  console.log(`Unique warning types: ${sortedWarnings.length}`);
}

export { testMap };

function countBy(arr: string[]) {
  return arr.reduce((acc, msg) => {
    acc[msg] = (acc[msg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function renderDistributionTable(
  { distributionStats, totalNodesPerRun }: {
    distributionStats: Record<
      string,
      { total: number; min: number; max: number; avg: number; runs: number[] }
    >;
    totalNodesPerRun: number[];
  },
) {
  const sortedTypes = Object.entries(distributionStats).sort((a, b) =>
    b[1].total - a[1].total
  );

  // Calculate average total nodes across all runs
  const avgTotalNodes =
    totalNodesPerRun.reduce((sum, count) => sum + count, 0) /
    totalNodesPerRun.length;

  const table = new Table()
    .header(["Symbol", "Type", "Total", "Avg", "Range", "Avg %", "Bar"])
    .body(sortedTypes.map(([type, stats], _i) => {
      const colorFn = getColorForType({ type });
      const symbol = locationSymbols[type as keyof typeof locationSymbols] ||
        "?";

      return [
        colorFn(symbol),
        colorFn(type),
        colorFn(stats.total.toString()),
        colorFn(stats.avg.toFixed(1)),
        colorFn(`${stats.min}-${stats.max}`),
        colorFn(
          `${getPercentage({ count: stats.avg, total: avgTotalNodes })}%`,
        ),
        colorFn(
          getBar({
            count: Math.round(stats.avg),
            total: Math.round(avgTotalNodes),
          }),
        ),
      ];
    }))
    .border(true)
    .padding(1);
  return table.toString();
}
