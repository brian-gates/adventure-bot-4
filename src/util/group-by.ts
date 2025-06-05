/**
 * Group an array of items by a key function.
 * @param arr - The array of items to group.
 * @param fn - The function to use to get the key for each item.
 * @returns A map of keys to arrays of items.
 * @example
 * ```ts
 * const grouped = groupBy({ arr: [1, 2, 3, 4, 5], fn: (n) => n % 2 });
 * // { '0': [2, 4], '1': [1, 3, 5] }
 * ```
 */
export function groupBy<T, K extends string | number>({
  arr,
  fn,
}: {
  arr: T[];
  fn: (item: T) => K;
}) {
  return arr.reduce((acc, item) => {
    const k = fn(item);
    const currentGroup = acc.get(k) || [];
    acc.set(k, [...currentGroup, item]);
    return acc;
  }, new Map<K, T[]>());
}
