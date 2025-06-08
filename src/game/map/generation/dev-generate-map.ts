import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.4/prompt/input.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { testMap } from "../test-map-validity.ts";
import { strategies } from "./index.ts";
import { logAsciiMap } from "./log-ascii-map.ts";

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

function renderCurrent() {
  console.clear();
  const strat = strategies[stratIndex];
  const { locations, paths } = strat.fn({
    cols,
    rows,
    minNodes,
    maxNodes,
    random: seededRandom(Math.floor(Math.random() * 1000000)),
  });
  const errors = testMap(
    { locations, paths, cols, rows },
    { minNodes, maxNodes }
  );
  logAsciiMap({
    map: { locations, paths, cols, rows },
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
