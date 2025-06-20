import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/input.ts";
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
  console.log(asciiMapString({ map }));
  console.log(
    `\nSeed: ${seed} | Frame: ${frameIndex + 1}/${frames.length}${
      isPlaying ? " | Playing... (P to stop)" : ""
    }`,
  );
  const { errors, warnings } = testMap(map, { minNodes, maxNodes });
  console.log("\n[Checks]");
  if (errors.length === 0 && warnings.length === 0) {
    console.log("All conditions passed ✅");
  } else {
    for (const err of errors) {
      console.log(`❌ ${err}`);
    }
    for (const warn of warnings) {
      console.log(`⚠️  ${warn}`);
    }
  }
  console.log(
    `\nCurrent: cols=${cols}, rows=${rows}, minNodes=${minNodes}, maxNodes=${maxNodes}`,
  );
  console.log(
    "\n←/→: prev/next map, ↑/↓: scrub animation, P: play, X: export, A: next algo, E: edit params, Q: quit",
  );
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
