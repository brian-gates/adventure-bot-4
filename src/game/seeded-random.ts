export function seededRandom(seed: number, cursor: number = 0) {
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
