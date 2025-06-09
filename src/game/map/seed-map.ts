import { prisma } from "~/db/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { stringToSeed } from "../string-to-seed.ts";
import { getMapGenerator } from "./generation/index.ts";

export async function seedMapForGuild({ guildId }: { guildId: string }) {
  console.log(`[seed-map] Seeding map for guild ${guildId}`);
  const existingMap = await prisma.map.findFirst({
    where: { guildId },
  });
  if (existingMap) {
    return;
  }
  const { seed } =
    (await prisma.guild.findUnique({ where: { guildId } })) ??
    (() => {
      throw new Error(`No guild found for guildId: ${guildId}`);
    })();

  const map = getMapGenerator("walk")({
    cols: 7,
    rows: 15,
    minNodes: 2,
    maxNodes: 5,
    random: seededRandom(stringToSeed(seed)),
    guildId,
  });
  console.log(
    `[seed-map] Built map: ${map.locations.length} locations, ${map.paths.length} paths`
  );

  // Prepare data for createMany
  const locationsData = map.locations.map((loc) => ({
    id: loc.id,
    mapId: map.id,
    name: `Node ${loc.col},${loc.row}`,
    description: "",
    attributes: {},
    row: loc.row,
    col: loc.col,
    type: loc.type,
  }));

  const pathsData = map.paths.map((path) => ({
    id: path.id,
    mapId: map.id,
    fromLocationId: path.fromLocationId,
    toLocationId: path.toLocationId,
    description: "",
    attributes: {},
  }));

  await prisma.map.deleteMany({ where: { guildId } });

  await prisma.$transaction([
    prisma.map.create({
      data: {
        id: map.id,
        guildId,
        cols: map.cols,
        rows: map.rows,
      },
    }),
    prisma.location.createMany({
      data: locationsData,
      skipDuplicates: true,
    }),
    prisma.path.createMany({
      data: pathsData,
      skipDuplicates: true,
    }),
    prisma.guild.upsert({
      where: { guildId },
      update: { locationId: map.locations[0].id },
      create: { guildId, locationId: map.locations[0].id },
    }),
  ]);

  console.log(`[seed-map] Created ${map.paths.length} paths`);
  console.log(`[seed-map] Map seeded for guild ${guildId}`);
}
