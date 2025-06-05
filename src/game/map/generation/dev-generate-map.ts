import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/input.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import type { Location, Path } from "~/generated/prisma/client.ts";
import { LocationType } from "~/generated/prisma/enums.ts";
import { assignLocationTypes } from "../locations/assign-location-types.ts";
import { testMap } from "../test-map-validity.ts";
import { strategies } from "./index.ts";

const locationTypeChar: Record<LocationType | "boss" | "campfire", string> = {
  combat: "X",
  elite: "E",
  tavern: "T",
  treasure: "$",
  event: "?",
  boss: "B",
  campfire: "C",
};

const promptInt = async (msg: string, def: number) => {
  const input = await Input.prompt({
    message: `${msg} [${def}]`,
    default: String(def),
  });
  const n = input === null || input.trim() === "" ? def : Number(input);
  return Number.isNaN(n) ? def : n;
};

const promptChoice = async (msg: string, options: string[], def: string) => {
  const input = await Input.prompt({
    message: `${msg} (${options.join("/")}) [${def}]`,
    default: def,
  });
  return input && options.includes(input) ? input : def;
};

let stratIndex = 0;
let strat = strategies[stratIndex].name;
let cols = 7;
let rows = 15;
let minNodes = 2;
let maxNodes = 5;

function extractFailingNodes(
  errors: string[],
  locations: Location[]
): Set<string> {
  const failing = new Set<string>();
  for (const err of errors) {
    let match = err.match(/Node (\d+,\d+)/);
    if (match) {
      failing.add(match[1]);
      continue;
    }
    match = err.match(/row (\d+), col (\d+)/);
    if (match) {
      failing.add(`${match[1]},${match[2]}`);
      continue;
    }
    match = err.match(/Row (\d+)/);
    if (match) {
      const row = Number(match[1]);
      for (const l of locations)
        if (l.row === row) failing.add(`${l.row},${l.col}`);
      continue;
    }
    match = err.match(/col (\d+)/);
    if (match) {
      const col = Number(match[1]);
      for (const l of locations)
        if (l.col === col) failing.add(`${l.row},${l.col}`);
      continue;
    }
    match = err.match(/\((\d+),(\d+)\)/);
    if (match) {
      failing.add(`${match[1]},${match[2]}`);
      continue;
    }
  }
  return failing;
}

const colorRed = (s: string) => `\x1b[31m${s}\x1b[0m`;

function logAsciiMap({
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
  const edgeMap: Record<
    string,
    { down?: boolean; left?: boolean; right?: boolean }
  > = {};
  paths.forEach(({ fromLocationId, toLocationId }: Path) => {
    const fromLoc = locations.find((l: Location) => l.id === fromLocationId);
    const toLoc = locations.find((l: Location) => l.id === toLocationId);
    if (!fromLoc || !toLoc) return;
    const dr = toLoc.row - fromLoc.row;
    const dc = toLoc.col - fromLoc.col;
    const key = `${fromLoc.row},${fromLoc.col}`;
    if (!edgeMap[key]) edgeMap[key] = {};
    if (dr === 1 && dc === 0) edgeMap[key].down = true;
    if (dr === 1 && dc === -1) edgeMap[key].left = true;
    if (dr === 1 && dc === 1) edgeMap[key].right = true;
  });
  let out = "";
  for (let row = rows - 1; row >= 0; row--) {
    let nodeLine = "";
    let edgeLine = "";
    for (let col = 0; col < cols; col++) {
      const node = nodeMap.get(`${row},${col}`);
      const key = `${row},${col}`;
      if (node) {
        if (failingNodes.has(key)) {
          nodeLine += ` ${colorRed(
            locationTypeChar[node.type as LocationType | "boss" | "campfire"] ??
              "O"
          )} `;
        } else {
          nodeLine += ` ${
            locationTypeChar[node.type as LocationType | "boss" | "campfire"] ??
            "O"
          } `;
        }
      } else {
        nodeLine += "   ";
      }
      const edge = edgeMap[key] || {};
      let edgeChars = "   ";
      if (row < rows - 1) {
        if (edge.left)
          edgeChars = edgeChars.slice(0, 0) + "/" + edgeChars.slice(1);
        if (edge.down)
          edgeChars = edgeChars.slice(0, 1) + "|" + edgeChars.slice(2);
        if (edge.right) edgeChars = edgeChars.slice(0, 2) + "\\";
      }
      edgeLine += edgeChars;
    }
    out += nodeLine + "\n";
    if (row < rows - 1) out += edgeLine + "\n";
  }
  console.log("[seed-map] ASCII map structure:\n" + out);
}

function renderCurrent() {
  console.clear();
  const strat = strategies[stratIndex];
  const raw = strat.fn({
    cols,
    rows,
    minNodes,
    maxNodes,
    random: seededRandom(0),
  });
  const { locations, paths } = assignLocationTypes({
    locations: raw.locations,
    paths: raw.paths,
  });
  const errors = testMap(
    { locations, paths },
    { cols, rows, minNodes, maxNodes, numPaths: 3 }
  );
  const failingNodes = extractFailingNodes(errors, locations as Location[]);
  logAsciiMap({
    locations: locations as Location[],
    paths: paths as Path[],
    cols,
    rows,
    failingNodes,
  });
  console.log("\n[Checks]");
  if (errors.length === 0) {
    console.log("All conditions passed ✅");
  } else {
    for (const err of errors) {
      console.log(`❌ ${err}`);
    }
  }
  console.log(
    `\nCurrent: strat=${strat.name}, cols=${cols}, rows=${rows}, minNodes=${minNodes}, maxNodes=${maxNodes}`
  );
  console.log("\n←/→: prev/next map, A: next algo, E: edit params, Q: quit");
}

if (import.meta.main) {
  renderCurrent();
  (async () => {
    for await (const key of new Keypress()) {
      if (key.key === "right") {
        renderCurrent();
      } else if (key.key === "left") {
        renderCurrent();
      } else if (key.key === "a") {
        stratIndex = (stratIndex + 1) % strategies.length;
        strat = strategies[stratIndex].name;
        renderCurrent();
      } else if (key.key === "e") {
        strat = await promptChoice(
          "Algorithm",
          strategies.map((s) => s.name),
          strat
        );
        stratIndex = strategies.findIndex((s) => s.name === strat);
        cols = await promptInt("Columns", cols);
        rows = await promptInt("Rows", rows);
        minNodes = await promptInt("Min nodes per row", minNodes);
        maxNodes = await promptInt("Max nodes per row", maxNodes);
        renderCurrent();
      } else if (key.key === "q" || key.sequence === "\u0003") {
        Deno.exit(0);
      }
    }
  })();
}
