import type { MapGenerator } from "../index.ts";
import { walkStrategy } from "./walk/walk.ts";

export { walkStrategy };

export const strategies = [
  { name: "walk", fn: walkStrategy },
] satisfies { name: string; fn: MapGenerator }[];

export function getMapGenerator(strategy: string): MapGenerator {
  switch (strategy) {
    case "walk":
      return walkStrategy;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
