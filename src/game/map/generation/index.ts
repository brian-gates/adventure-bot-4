import type { Map } from "~/game/map/index.ts";

export type MapGenerator = (opts: {
  cols: number;
  rows: number;
  minNodes?: number;
  maxNodes?: number;
  numPaths?: number;
  random: () => number;
}) => Map;

import { trailblazingStrategy } from "~/game/map/generation/trailblazing.ts";
import { branchingTrailblazerStrategy } from "./branching-trailblazer.ts";
import { gridStrategy } from "./grid.ts";
import { rowwiseBranchingMapGenerator } from "./rowwise-branching-map-generator.ts";
import { slayTheSpireMapGenerator } from "./slay-the-spire-map-generator.ts";
import { walkStrategy } from "./walk/walk.ts";

export {
  branchingTrailblazerStrategy,
  gridStrategy,
  rowwiseBranchingMapGenerator,
  slayTheSpireMapGenerator,
  trailblazingStrategy,
  walkStrategy,
};

export const strategies = [
  { name: "walk", fn: walkStrategy },
  { name: "grid", fn: gridStrategy },
  { name: "trailblazing", fn: trailblazingStrategy },
  // { name: "branching-trailblazer", fn: branchingTrailblazerStrategy },
  { name: "rowwise-branching", fn: rowwiseBranchingMapGenerator },
  { name: "slay-the-spire", fn: slayTheSpireMapGenerator },
];

export function getMapGenerator(strategy: string): MapGenerator {
  switch (strategy) {
    case "grid":
      return gridStrategy;
    case "trailblazing":
      return trailblazingStrategy;
    case "branching-trailblazer":
      return branchingTrailblazerStrategy;
    case "rowwise-branching":
      return rowwiseBranchingMapGenerator;
    case "slay-the-spire":
      return slayTheSpireMapGenerator;
    case "walk":
      return walkStrategy;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
