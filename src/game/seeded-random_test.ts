import { seededRandom } from "./seeded-random.ts";

Deno.test("Same seed, same sequence", () => {
  const rand1 = seededRandom(42);
  const rand2 = seededRandom(42);
  for (let i = 0; i < 10; i++) {
    if (rand1() !== rand2()) throw new Error("Sequences differ at step " + i);
  }
});

Deno.test("Different seeds, different sequences", () => {
  const rand1 = seededRandom(42);
  const rand2 = seededRandom(43);
  let same = true;
  for (let i = 0; i < 10; i++) {
    if (rand1() !== rand2()) {
      same = false;
      break;
    }
  }
  if (same) throw new Error("Different seeds produced same sequence");
});

Deno.test("Cursor advances sequence", () => {
  const rand1 = seededRandom(42, 5);
  const rand2 = seededRandom(42);
  for (let i = 0; i < 5; i++) rand2();
  if (rand1() !== rand2()) {
    throw new Error("Cursor did not advance sequence correctly");
  }
});

Deno.test("Reproducibility after restart", () => {
  const seed = 12345;
  const cursor = 7;
  const rand1 = seededRandom(seed, cursor);
  const value1 = rand1();
  // Simulate process restart
  const rand2 = seededRandom(seed, cursor);
  const value2 = rand2();
  if (value1 !== value2) {
    throw new Error("Reproducibility failed after restart");
  }
});

Deno.test("Batch generation matches single-step", () => {
  const seed = 99;
  const batchSize = 10;
  const randBatch = seededRandom(seed, 0);
  const batch = Array.from({ length: batchSize }, () => randBatch());
  for (let i = 0; i < batchSize; i++) {
    const randSingle = seededRandom(seed, i);
    const single = randSingle();
    if (batch[i] !== single) {
      throw new Error(`Batch and single-step differ at index ${i}`);
    }
  }
});
