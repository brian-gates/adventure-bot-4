import { prisma } from "~/db/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { findOrCreateGuild } from "../../db/find-or-create-guild.ts";
import { stringToSeed } from "../string-to-seed.ts";
import { getMapGenerator } from "./generation/index.ts";

export async function seedMapForGuild({ id }: { id: bigint }) {
  console.log(`[seed-map] Seeding map for guild ${id}`);
  const existingMap = await prisma.map.findFirst({
    where: { guild: { is: { id } } },
  });
  if (existingMap) {
    console.log(`[seed-map] Map already exists for guild ${id}`);
    return;
  }
  const guild = await findOrCreateGuild({ id });
  const { seed } = guild;

  const map = getMapGenerator("walk")({
    cols: 7,
    rows: 15,
    minNodes: 2,
    maxNodes: 5,
    random: seededRandom(stringToSeed(seed)),
    guildId: id,
  });
  console.log(
    `[seed-map] Built map: ${map.locations.length} locations, ${map.paths.length} paths`,
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

  await prisma.$transaction([
    prisma.map.create({
      data: {
        id: map.id,
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
      where: { id },
      update: { locationId: map.locations[0].id, map: { connect: { id: map.id } } },
      create: { id, locationId: map.locations[0].id, map: { connect: { id: map.id } } },
    }),
  ]);

  console.log(`[seed-map] Created ${map.paths.length} paths`);
  console.log(`[seed-map] Map seeded for guild ${id}`);
}
