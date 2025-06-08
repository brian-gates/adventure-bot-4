import type { Location, Path } from "~/generated/prisma/client.ts";

export type Map = {
  locations: Location[];
  paths: Path[];
  cols: number;
  rows: number;
};

export type Position = {
  row: number;
  col: number;
};

export type MapGenerator = (opts: {
  cols: number;
  rows: number;
  minNodes?: number;
  maxNodes?: number;
  numPaths?: number;
  random: () => number;
  onStep?: (map: Map) => void;
}) => Map;

export { LocationType } from "~/generated/prisma/client.ts";
export type { Location, Path } from "~/generated/prisma/client.ts";
