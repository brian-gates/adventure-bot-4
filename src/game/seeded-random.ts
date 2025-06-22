import { stringToSeed } from "./string-to-seed.ts";

export function seededRandom(seed: number | string, cursor: number = 0) {
  if (typeof seed === "string") {
    seed = stringToSeed(seed);
  }
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  let state = seed;
  for (let i = 0; i < cursor; i++) {
    state = (a * state + c) % m;
  }
  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
}
