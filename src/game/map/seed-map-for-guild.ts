import { findOrCreateGuild } from "~/db/find-or-create-guild.ts";
import { prisma } from "~/db/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { GameMap } from "./game-map.ts";
import { walkStrategy } from "./generation/walk/walk-strategy.ts";

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

  const map = walkStrategy({
    cols: 7,
    rows: 15,
    random: seededRandom(guild.seed),
  });
  console.log(
    `[seed-map] Built map: ${map.locations.length} locations, ${map.paths.length} paths`,
  );

  const gameMap = new GameMap(map);
  await gameMap.save({ guildId: id, prisma });

  console.log(`[seed-map] Created ${map.paths.length} paths`);
  console.log(`[seed-map] Map seeded for guild ${id}`);
}
