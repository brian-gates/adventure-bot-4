import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/input.ts";
import { Map } from "~/game/map/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { stringToSeed } from "~/game/string-to-seed.ts";
import { testMap } from "../test-map-validity.ts";
import { strategies } from "./index.ts";
import { asciiMapString } from "./log-ascii-map.ts";

async function promptInt(msg: string, def: number) {
  const input = await Input.prompt({
    message: `${msg} [${def}]`,
    default: String(def),
  });
  const n = input === null || input.trim() === "" ? def : Number(input);
  return Number.isNaN(n) ? def : n;
}

async function promptChoice(msg: string, options: string[], def: string) {
  const input = await Input.prompt({
    message: `${msg} (${options.join("/")}) [${def}]`,
    default: def,
  });
  return input && options.includes(input) ? input : def;
}

let stratIndex = 0;
let strat = strategies[stratIndex].name;
let cols = 7;
let rows = 15;
let minNodes = 2;
let maxNodes = 5;
let seed = 0;

let frames: Map[] = [];
let frameIndex = 0;
let isPlaying = false;

async function exportAnimationFrames() {
  const fileName = `map-animation-seed-${seed}.txt`;
  const delimiter = "\n\n====================\n\n";
  const content = frames
    .map(
      (frame, i) =>
        `Frame ${i + 1}/${frames.length}\n${
          asciiMapString({
            map: frame,
          })
        }`,
    )
    .join(delimiter);
  await Deno.writeTextFile(fileName, content);
  console.log(`\nExported animation to ${fileName}`);
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
  const strat = strategies[stratIndex];
  const errors = testMap(map, { minNodes, maxNodes });
  console.log("\n[Checks]");
  if (errors.length === 0) {
    console.log("All conditions passed ✅");
  } else {
    for (const err of errors) {
      console.log(`❌ ${err}`);
    }
  }
  console.log(
    `\nCurrent: strat=${strat.name}, cols=${cols}, rows=${rows}, minNodes=${minNodes}, maxNodes=${maxNodes}`,
  );
  console.log(
    "\n←/→: prev/next map, ↑/↓: scrub animation, P: play, X: export, A: next algo, E: edit params, Q: quit",
  );
}

function renderCurrent() {
  frames = [];
  frameIndex = 0;
  isPlaying = false;
  const strat = strategies[stratIndex];
  strat.fn({
    cols,
    rows,
    minNodes,
    maxNodes,
    random: seededRandom(stringToSeed(seed.toString())),
    onStep: (map: Map) => frames.push(map),
    guildId: BigInt(1),
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
        await exportAnimationFrames();
      } else if (key.key === "a") {
        stratIndex = (stratIndex + 1) % strategies.length;
        strat = strategies[stratIndex].name;
        renderCurrent();
      } else if (key.key === "e") {
        strat = await promptChoice(
          "Algorithm",
          strategies.map((s) => s.name),
          strat,
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
