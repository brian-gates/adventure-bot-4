import { prisma } from "~/db/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { stringToSeed } from "../string-to-seed.ts";
import { getMapGenerator } from "./generation/index.ts";
import { assignLocationTypes } from "./locations/assign-location-types.ts";

export async function seedMapForGuild({ guildId }: { guildId: string }) {
  console.log(`[seed-map] Seeding map for guild ${guildId}`);
  let map = await prisma.map.findFirst({ where: { channelId: guildId } });
  if (!map) {
    map = await prisma.map.create({
      data: {
        channelId: guildId,
        rows: 15,
        cols: 7,
      },
    });
  }
  const { seed } = (await prisma.guild.findUnique({ where: { guildId } })) ?? {
    seed: "42",
  };
  const existing = await prisma.location.findFirst({
    where: { mapId: map.id },
  });
  if (existing) {
    console.log(`[seed-map] Map already exists for guild ${guildId}`);
    return;
  }
  const cols = map.cols;
  const rows = map.rows;
  const minNodes = 2;
  const maxNodes = 5;
  const { locations: locs, paths: rawPaths } = getMapGenerator("walk")({
    cols,
    rows,
    minNodes,
    maxNodes,
    random: seededRandom(stringToSeed(seed)),
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
          mapId: map.id,
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
          mapId: map.id,
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
    update: { locationId: locationIds[0] },
    create: { guildId, locationId: locationIds[0] },
  });
  console.log(`[seed-map] Map seeded for guild ${guildId}`);
}
