import type { Map } from "~/game/map/index.ts";
import type {
  Location,
  LocationType,
  Path,
} from "~/generated/prisma/client.ts";
import { isReachablePosition } from "./walk/walk.ts";

export function asciiMapString({ map }: { map: Map }) {
  const { locations, paths, cols, rows } = map;
  const failingNodes = new Set<string>();
  const locationMap = new Map(locations.map((l) => [`${l.row},${l.col}`, l]));
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
  // Find boss for reachability
  const boss = locations.find((l) => l.type === "boss");
  let out = "";
  // Add column numbers at the top
  out += "    ";
  for (let col = 0; col < cols; col++) {
    out += col.toString().padStart(3, " ");
  }
  out += "\n";
  for (let row = rows - 1; row >= 0; row--) {
    let nodeLine = row.toString().padStart(3, " ") + " ";
    for (let col = 0; col < cols; col++) {
      const location = locationMap.get(`${row},${col}`);
      const key = `${row},${col}`;
      const reachable =
        boss &&
        isReachablePosition({
          row,
          col,
          targetRow: boss.row,
          targetCols: [boss.col],
          spread: 1,
          rows,
          cols,
        });
      if (location) {
        const color = locationTypeColor[location.type];
        if (failingNodes.has(key)) {
          nodeLine += ` ${colorRed(locationTypeChar[location.type] ?? "O")} `;
        } else {
          nodeLine += ` ${color}${
            locationTypeChar[location.type] ?? "O"
          }${resetColor} `;
        }
      } else {
        nodeLine += reachable ? " . " : "███";
      }
    }
    out += nodeLine + "\n";
    if (row > 0) {
      out += "    ";
      out += (edgeLines[row - 1] || []).join("") + "\n";
    }
  }
  return out;
}

export function logAsciiMap({ map }: { map: Map }) {
  console.log("[seed-map] ASCII map structure:\n" + asciiMapString({ map }));
}

export const colorRed = (s: string) => `\x1b[31m${s}\x1b[0m`;

export function getPathAngle({
  path,
  locations,
}: {
  path: Path;
  locations: Location[];
}) {
  const from = locations.find((l) => l.id === path.fromLocationId);
  const to = locations.find((l) => l.id === path.toLocationId);
  if (!from || !to) return null;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr === 1 && dc === 0) return "|";
  if (dr === 1 && dc === -1) return "\\";
  if (dr === 1 && dc === 1) return "/";
  return null;
}

const locationTypeChar: Record<LocationType | "boss" | "campfire", string> = {
  combat: "X",
  elite: "E",
  tavern: "T",
  treasure: "$",
  event: "?",
  boss: "B",
  campfire: "C",
  shop: "S",
};

const locationTypeColor: Record<
  LocationType | "boss" | "campfire" | "shop",
  string
> = {
  combat: "\x1b[32m", // Green
  elite: "\x1b[35m", // Magenta
  tavern: "\x1b[36m", // Cyan
  treasure: "\x1b[33m", // Yellow
  event: "\x1b[34m", // Blue
  boss: "\x1b[31m", // Red
  campfire: "\x1b[37m", // White
  shop: "\x1b[90m", // Bright Black (Gray)
};
const resetColor = "\x1b[0m";
