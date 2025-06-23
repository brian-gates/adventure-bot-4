import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/input.ts";
import { Table } from "https://deno.land/x/cliffy@v1.0.0-rc.4/table/mod.ts";
import { Map } from "~/game/map/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { stringToSeed } from "~/game/string-to-seed.ts";
import { testMap } from "../test-map-validity.ts";
import { walkStrategy } from "./index.ts";
import { asciiMapString } from "./log-ascii-map.ts";

async function promptInt(msg: string, def: number) {
  const input = await Input.prompt({
    message: `${msg} [${def}]`,
    default: String(def),
  });
  const n = input === null || input.trim() === "" ? def : Number(input);
  return Number.isNaN(n) ? def : n;
}

let cols = 7;
let rows = 15;
let minNodes = 2;
let maxNodes = 5;
let seed = 0;

let frames: Map[] = [];
let frameIndex = 0;
let isPlaying = false;

// Legend mapping for location types
const locationSymbols: Record<string, string> = {
  combat: "X",
  treasure: "$",
  event: "?",
  elite: "E",
  boss: "B",
  campfire: "C",
  shop: "S",
  tavern: "T",
};

// Color codes for location types (matching log-ascii-map.ts)
const locationTypeColor: Record<string, string> = {
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

function getNodeTypeDistribution(map: Map) {
  const distribution: Record<string, number> = {};

  // Count each location type
  for (const location of map.locations) {
    const type = location.type;
    distribution[type] = (distribution[type] || 0) + 1;
  }

  return distribution;
}

function formatDistribution(distribution: Record<string, number>) {
  const total = Object.values(distribution).reduce(
    (sum, count) => sum + count,
    0,
  );
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  let result = `\n[Node Type Distribution] (Total: ${total})\n`;
  for (const [type, count] of sorted) {
    const percentage = ((count / total) * 100).toFixed(1);
    const bar = "█".repeat(Math.round((count / total) * 20));
    const symbol = locationSymbols[type] || "?";
    result += `${symbol} ${type.padEnd(10)} ${count.toString().padStart(2)} (${
      percentage.padStart(4)
    }%) ${bar}\n`;
  }

  return result;
}

function formatLegend() {
  let result = "\n[Legend]\n";
  const sortedTypes = Object.entries(locationSymbols).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [type, symbol] of sortedTypes) {
    result += `${symbol} = ${type}\n`;
  }

  return result;
}

async function exportAnimation() {
  console.log(`Exporting animation...`);
  const p = new Deno.Command("node", {
    args: ["ascii-to-gif.js"],
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
  }).spawn();

  const writer = p.stdin.getWriter();
  await writer.write(new TextEncoder().encode(
    frames
      .map((frame, i) =>
        `Frame ${i + 1}/${frames.length}\n${asciiMapString({ map: frame })}`
      )
      .join("\n\n====================\n\n"),
  ));
  await writer.close();
  await Deno.writeFile(`map-animations/${seed}.gif`, p.stdout);
  console.log(`Animation saved to map-animations/${seed}.gif`);
}

function renderFrame() {
  console.clear();
  const map = frames[frameIndex] || frames[frames.length - 1];
  const mapLines = asciiMapString({ map, color: true }).split("\n");
  const mapLinesNoColor = asciiMapString({ map, color: false }).split("\n");

  const { errors, warnings } = testMap(map, { minNodes, maxNodes });

  // Build right column content - more compact
  let rightColumn = [];
  rightColumn.push(
    `Seed: ${seed} | Frame: ${frameIndex + 1}/${frames.length}${
      isPlaying ? " | Playing..." : ""
    }`,
  );

  // Checks section - using table for consistency
  const checksTable = new Table()
    .header(["Status"])
    .body([
      [
        errors.length === 0 && warnings.length === 0
          ? "All conditions passed ✅"
          : "Issues found ⚠️",
      ],
      ...errors.map((err) => [`❌ ${err}`]),
      ...warnings.map((warn) => [`⚠️  ${warn}`]),
    ])
    .border(true)
    .padding(1);

  const checksLines = checksTable.toString().split("\n");
  rightColumn.push(...checksLines);

  // Distribution section - using cliffy Table for proper alignment
  const distribution = getNodeTypeDistribution(map);
  const total = Object.values(distribution).reduce(
    (sum, count) => sum + count,
    0,
  );
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  // Create table for distribution
  const distributionTable = new Table()
    .header(["Symbol", "Type", "Count", "Percentage"])
    .body(sorted.map(([type, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const symbol = locationSymbols[type] || "?";
      const color = locationTypeColor[type] || "";
      return [
        `${color}${symbol}${resetColor}`,
        type,
        count.toString(),
        `${percentage}%`,
      ];
    }))
    .border(true)
    .padding(1);

  // Add table lines to right column
  const tableLines = distributionTable.toString().split("\n");
  rightColumn.push(...tableLines);

  // Controls section - using table for consistency
  const controlsTable = new Table()
    .header(["Controls"])
    .body([
      [`cols=${cols}, rows=${rows}, min=${minNodes}, max=${maxNodes}`],
      ["←/→: prev/next, ↑/↓: scrub, P: play, X: export, Q: quit"],
    ])
    .border(true)
    .padding(1);

  const controlsLines = controlsTable.toString().split("\n");
  rightColumn.push(...controlsLines);

  // Find the longest map line using the non-colored version for width calculation
  const maxMapWidth = Math.max(...mapLinesNoColor.map((line) => line.length));

  // Calculate the maximum height needed
  const maxHeight = Math.max(mapLines.length, rightColumn.length);

  // Display in two columns with minimal spacing
  for (let i = 0; i < maxHeight; i++) {
    const mapLine = i < mapLines.length ? mapLines[i] : "";
    const rightLine = i < rightColumn.length ? rightColumn[i] : "";

    // Use the non-colored line for width calculation, but display the colored line
    const mapLineNoColor = i < mapLinesNoColor.length ? mapLinesNoColor[i] : "";
    const paddingNeeded = maxMapWidth - mapLineNoColor.length;
    const padding = " ".repeat(paddingNeeded);

    console.log(`${mapLine}${padding} ${rightLine}`);
  }
}

function renderCurrent() {
  frames = [];
  frameIndex = 0;
  isPlaying = false;
  walkStrategy({
    cols,
    rows,
    random: seededRandom(stringToSeed(seed.toString())),
    onStep: (map: Map) => frames.push(map),
  });
  frameIndex = frames.length - 1; // Start at the end by default
  renderFrame();
}

async function playAnimation() {
  if (isPlaying) return;
  isPlaying = true;
  frameIndex = 0;
  renderFrame();
  while (isPlaying && frameIndex < frames.length - 1) {
    await new Promise((res) => setTimeout(res, 120));
    frameIndex++;
    renderFrame();
  }
  isPlaying = false;
  renderFrame();
}

if (import.meta.main) {
  renderCurrent();
  (async () => {
    for await (const key of new Keypress()) {
      if (key.key === "right") {
        seed++;
        renderCurrent();
      } else if (key.key === "left") {
        seed--;
        renderCurrent();
      } else if (key.key === "down") {
        if (!isPlaying && frameIndex < frames.length - 1) {
          frameIndex++;
          renderFrame();
        }
      } else if (key.key === "up") {
        if (!isPlaying && frameIndex > 0) {
          frameIndex--;
          renderFrame();
        }
      } else if (key.key === "p") {
        if (isPlaying) {
          isPlaying = false;
        } else {
          await playAnimation();
        }
      } else if (key.key === "x") {
        await exportAnimation();
      } else if (key.key === "e") {
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
