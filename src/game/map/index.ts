import { prisma } from "~/db/index.ts";

export type Position = {
  row: number;
  col: number;
};

export type MapGenerator = (opts: {
  cols?: number;
  rows?: number;
  minNodes?: number;
  maxNodes?: number;
  numPaths?: number;
  random: () => number;
  onStep?: (map: Map) => void;
  guildId: string;
}) => Map;

export { LocationType } from "~/generated/prisma/client.ts";
export type { Location, Path } from "~/generated/prisma/client.ts";

function getMapById(mapId: string) {
  return prisma.map.findUnique({
    where: { id: mapId },
    include: { locations: true, paths: true },
  });
}

export type Map = NonNullable<Awaited<ReturnType<typeof getMapById>>>;
