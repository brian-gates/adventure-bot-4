import { prisma } from "~/db/index.ts";
import { walkStrategy } from "./generation/walk/walk-strategy.ts";
import { GameMap } from "./game-map.ts";

export async function seedMapForGuild(
  { id, random }: { id: bigint; random: () => number },
) {
  console.log(`[seed-map] Seeding map for guild ${id}`);
  const existingMap = await prisma.map.findFirst({
    where: { guild: { is: { id } } },
  });
  if (existingMap) {
    console.log(`[seed-map] Map already exists for guild ${id}`);
    return;
  }

  const map = walkStrategy({
    cols: 7,
    rows: 15,
    random,
  });
  console.log(
    `[seed-map] Built map: ${map.locations.length} locations for guild ${id}`,
  );
  await new GameMap(map).save({ guildId: id, prisma });
}
