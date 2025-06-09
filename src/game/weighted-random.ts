export function weightedRandom<T extends string | number | symbol>(
  table: Record<T, number>,
  random: () => number,
): T {
  const total = Object.values(table).reduce(
    (a, b) => (a as number) + (b as number),
    0 as number,
  ) as number;
  const r = random() * total;
  let cumulative = 0;
  for (const [key, value] of Object.entries(table).sort() as [T, number][]) {
    cumulative += value;
    if (r < cumulative) return key;
  }
  throw new Error("No value found");
}
