import { weightedRandom } from "./weighted-random.ts";

Deno.test("weightedRandom returns the only key if one entry", () => {
  const result = weightedRandom({ a: 1 }, () => 0.5);
  if (result !== "a") throw new Error("Should return the only key");
});

Deno.test("weightedRandom respects weights", () => {
  const table = { a: 1, b: 3 };
  const results = { a: 0, b: 0 };
  for (let i = 0; i < 1000; i++) {
    const r = weightedRandom(table, Math.random);
    results[r]++;
  }
  // b should be about 3x as likely as a
  if (!(results.b > results.a * 2 && results.b < results.a * 4)) {
    throw new Error(
      `b should be about 3x as likely as a, got a=${results.a}, b=${results.b}`,
    );
  }
});

Deno.test("weightedRandom throws on empty table", () => {
  let threw = false;
  try {
    weightedRandom({}, () => 0.5);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("Should throw on empty table");
});

Deno.test("weightedRandom returns correct key for edge random values", () => {
  const table = { a: 1, b: 1, c: 1 };
  const keys = [0, 0.33, 0.66, 0.99];
  const sortedKeys = Object.keys(table).sort();
  const expected = [sortedKeys[0], sortedKeys[0], sortedKeys[1], sortedKeys[2]];
  for (let i = 0; i < keys.length; i++) {
    const r = weightedRandom(table, () => keys[i]);
    if (r !== expected[i]) throw new Error(`Expected ${expected[i]}, got ${r}`);
  }
});
