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

  const startLocation = map.locations
    .filter((loc) => loc.type === "combat")
    .reduce(
      (bottom, loc) => (loc.row > bottom.row ? loc : bottom),
      map.locations[0],
    );

  await prisma.$transaction(async (tx) => {
    await tx.location.createMany({
      data: locationsData,
      skipDuplicates: true,
    });
    await tx.path.createMany({
      data: pathsData,
      skipDuplicates: true,
    });
    await tx.guild.upsert({
      where: { id },
      update: {
        currentLocation: { connect: { id: startLocation.id } },
        map: { connect: { id: map.id } },
      },
      create: {
        id,
        currentLocation: { connect: { id: startLocation.id } },
        map: { connect: { id: map.id } },
      },
    });
    await tx.map.create({
      data: {
        id: map.id,
        cols: map.cols,
        rows: map.rows,
      },
    });
  });

  console.log(`[seed-map] Created ${map.paths.length} paths`);
  console.log(`[seed-map] Map seeded for guild ${id}`);
}
