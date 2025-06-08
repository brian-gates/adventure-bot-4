import { prisma } from "~/db/index.ts";

export type Position = {
  row: number;
  col: number;
};

export type MapGenerator = (opts: {
  rows: number;
  cols: number;
  minNodes?: number;
  maxNodes?: number;
  numPaths?: number;
  random: () => number;
  onStep?: (map: Map) => void;
}) => Map;

export { LocationType } from "~/generated/prisma/client.ts";
export type { Location, Path } from "~/generated/prisma/client.ts";

async function getMapWithLocationsAndPaths(mapId: string) {
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { locations: true, paths: true },
  });
  return map;
}

export type Map = NonNullable<
  Awaited<ReturnType<typeof getMapWithLocationsAndPaths>>
>;
