import type { Location, Path } from "~/generated/prisma/client.ts";
import { locationTypeChar } from "./dev-generate-map.ts";

export function logAsciiMap({
  locations,
  paths,
  cols,
  rows,
  failingNodes = new Set(),
}: {
  locations: Location[];
  paths: Path[];
  cols: number;
  rows: number;
  failingNodes?: Set<string>;
}) {
  const nodeMap = new Map(locations.map((l) => [`${l.row},${l.col}`, l]));
  // Prepare edgeLines: edgeLines[row][col] is the edge char below node at (row+1, col)
  const edgeLines: string[][] = Array.from({ length: rows - 1 }, () =>
    Array(cols).fill("   ")
  );
  for (const path of paths) {
    const from = locations.find((l) => l.id === path.fromLocationId);
    const angle = getPathAngle({ path, locations });
    if (!from || !angle) continue;
    const row = from.row;
    const col = from.col;
    if (row >= rows - 1) continue;
    if (angle === "|")
      edgeLines[row][col] =
        edgeLines[row][col].slice(0, 1) + "|" + edgeLines[row][col].slice(2);
    if (angle === "/" && col < cols - 1)
      edgeLines[row][col + 1] =
        edgeLines[row][col + 1].slice(0, 0) +
        "/" +
        edgeLines[row][col + 1].slice(1);
    if (angle === "\\" && col > 0)
      edgeLines[row][col - 1] = edgeLines[row][col - 1].slice(0, 2) + "\\";
  }
  let out = "";
  for (let row = rows - 1; row >= 0; row--) {
    let nodeLine = "";
    for (let col = 0; col < cols; col++) {
      const node = nodeMap.get(`${row},${col}`);
      const key = `${row},${col}`;
      if (node) {
        if (failingNodes.has(key)) {
          nodeLine += ` ${colorRed(locationTypeChar[node.type] ?? "O")} `;
        } else {
          nodeLine += ` ${locationTypeChar[node.type] ?? "O"} `;
        }
      } else {
        nodeLine += "   ";
      }
    }
    out += nodeLine + "\n";
    if (row > 0) {
      out += (edgeLines[row - 1] || []).join("") + "\n";
    }
  }
  console.log("[seed-map] ASCII map structure:\n" + out);
}

export const colorRed = (s: string) => `\x1b[31m${s}\x1b[0m`;

export const getPathAngle = ({
  path,
  locations,
}: {
  path: Path;
  locations: Location[];
}) => {
  const from = locations.find((l) => l.id === path.fromLocationId);
  const to = locations.find((l) => l.id === path.toLocationId);
  if (!from || !to) return null;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr === 1 && dc === 0) return "|";
  if (dr === 1 && dc === -1) return "\\";
  if (dr === 1 && dc === 1) return "/";
  return null;
};
