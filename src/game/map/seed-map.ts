import { seededRandom } from "~/game/seeded-random.ts";
import { PrismaClient } from "~/generated/prisma/client.ts";
import { getMapGenerator } from "./generation/index.ts";
import { assignLocationTypes } from "./locations/assign-location-types.ts";

const prisma = new PrismaClient();

export const seedMapForGuild = async ({ guildId }: { guildId: string }) => {
  console.log(`[seed-map] Seeding map for guild ${guildId}`);
  const existing = await prisma.location.findFirst({
    where: { channelId: guildId },
  });
  if (existing) {
    console.log(`[seed-map] Map already exists for guild ${guildId}`);
    return;
  }
  const cols = 7;
  const rows = 15;
  const minNodes = 2;
  const maxNodes = 5;
  const { locations: locs, paths: rawPaths } = getMapGenerator("walk")({
    cols,
    rows,
    minNodes,
    maxNodes,
    random: seededRandom(0),
  });
  // Assign location types
  let { locations: typedLocs } = assignLocationTypes(
    { locations: locs, paths: rawPaths },
    { seed: 42 }
  );
  // Ensure first location is always combat
  const firstRow = Math.min(...typedLocs.map((l) => l.row));
  const centerCol = Math.floor(cols / 2);
  typedLocs = typedLocs.map((l) =>
    l.row === firstRow && l.col === centerCol ? { ...l, type: "combat" } : l
  );
  // logAsciiMap({ locations: locs, paths: rawPaths, cols, rows });
  console.log(
    `[seed-map] Built map: ${typedLocs.length} locations, ${rawPaths.length} paths`
  );
  // Create all locations in the database first
  const locationIds = typedLocs.map(() => crypto.randomUUID());
  await Promise.all(
    typedLocs.map((loc, i) =>
      prisma.location.create({
        data: {
          id: locationIds[i],
          channelId: guildId,
          name: `Node ${loc.col},${loc.row}`,
          description: "",
          attributes: {},
          row: loc.row,
          col: loc.col,
          type: loc.type,
        },
      })
    )
  );
  // After creating locationIds
  const idMap = new Map(typedLocs.map((loc, i) => [loc.id, locationIds[i]]));

  await Promise.all(
    rawPaths.map((path: { fromLocationId: string; toLocationId: string }) =>
      prisma.path.create({
        data: {
          id: crypto.randomUUID(),
          channelId: guildId,
          fromLocationId:
            idMap.get(path.fromLocationId) ??
            (() => {
              throw new Error(`Missing fromLocationId: ${path.fromLocationId}`);
            })(),
          toLocationId:
            idMap.get(path.toLocationId) ??
            (() => {
              throw new Error(`Missing toLocationId: ${path.toLocationId}`);
            })(),
          description: "",
          attributes: {},
        },
      })
    )
  );
  await prisma.guild.upsert({
    where: { guildId },
    update: { currentLocationId: locationIds[0] },
    create: { guildId, currentLocationId: locationIds[0] },
  });
  console.log(`[seed-map] Map seeded for guild ${guildId}`);
};
