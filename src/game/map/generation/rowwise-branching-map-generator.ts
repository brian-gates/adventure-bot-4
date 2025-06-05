import { seededRandom } from "~/game/seeded-random.ts";
import {
  type Location,
  LocationType,
  type Path,
} from "~/generated/prisma/client.ts";

export const rowwiseBranchingMapGenerator = ({
  cols,
  rows,
  minNodes = 2,
  maxNodes = 5,
  random = seededRandom(0),
}: {
  cols: number;
  rows: number;
  minNodes?: number;
  maxNodes?: number;
  random?: () => number;
}) => {
  const center = Math.floor(cols / 2);
  const allRows: { row: number; col: number }[][] = Array.from(
    { length: rows },
    (_, i) => (i === 0 || i === rows - 1 ? [{ row: i, col: center }] : [])
  );
  for (let row = 1; row < rows - 1; row++) {
    const count = Math.floor(random() * (maxNodes - minNodes + 1)) + minNodes;
    const used = new Set<number>();
    while (allRows[row].length < count) {
      const col = Math.floor(random() * cols);
      if (!used.has(col)) {
        allRows[row].push({ row, col });
        used.add(col);
      }
    }
    allRows[row].sort((a, b) => a.col - b.col);
  }
  const nodeMap = new Map<string, Location>();
  const locations: Location[] = [];
  for (const row of allRows)
    for (const { row: r, col } of row) {
      const id = `${r},${col}`;
      const loc: Location = {
        id,
        channelId: "",
        row: r,
        col,
        name: `Node ${col},${r}`,
        description: "",
        attributes: {},
        type: LocationType.combat,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Location;
      nodeMap.set(id, loc);
      locations.push(loc);
    }
  const edgeSet = new Set<string>();
  for (let row = 0; row < rows - 1; row++) {
    const fromNodes = allRows[row];
    const toNodes = allRows[row + 1];
    for (const from of fromNodes) {
      let targets = toNodes.filter((to) => Math.abs(to.col - from.col) <= 1);
      if (targets.length === 0) {
        let minDist = cols;
        let closest: { row: number; col: number } | undefined;
        for (const to of toNodes) {
          const d = Math.abs(to.col - from.col);
          if (d < minDist) {
            minDist = d;
            closest = to;
          }
        }
        if (closest) targets = [closest];
      }
      for (const to of targets) {
        const key = `${from.row},${from.col}->${to.row},${to.col}`;
        if (!edgeSet.has(key)) edgeSet.add(key);
      }
    }
  }
  const paths: Path[] = Array.from(edgeSet).map((s) => {
    const [from, to] = s.split("->");
    return {
      id: crypto.randomUUID(),
      channelId: "",
      fromLocationId: from,
      toLocationId: to,
      description: "",
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Path;
  });
  return { locations, paths, cols, rows };
};
