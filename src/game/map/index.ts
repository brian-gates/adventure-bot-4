import { prisma } from "~/db/index.ts";

export type Position = {
  row: number;
  col: number;
};

export { LocationType } from "~/generated/prisma/client.ts";
export type { Location, Path } from "~/generated/prisma/client.ts";

export function getMapById(mapId: string) {
  return prisma.map.findUnique({
    where: { id: mapId },
    include: {
      locations: true,
      paths: true,
      guild: { include: { currentLocation: true } },
    },
  });
}

export type Map = NonNullable<Awaited<ReturnType<typeof getMapById>>>;
