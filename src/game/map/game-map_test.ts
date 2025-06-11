import { prisma } from "~/db/index.ts";
import { GameMap } from "./game-map.ts";
import { walkStrategy } from "./generation/walk/walk.ts";

Deno.test({
  name:
    "integration: GameMap.save persists map, locations, and paths with valid mapId",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    if (!Deno.env.get("DATABASE_URL")) {
      console.log("Skipping integration test: DATABASE_URL not set");
      return;
    }
    const mapId = crypto.randomUUID();
    const guildId = BigInt(0);
    const mapData = walkStrategy({
      cols: 5,
      rows: 5,
      random: Math.random,
      guildId,
    });
    mapData.id = mapId;
    const gameMap = new GameMap(mapData);

    let errorCaught = false;
    try {
      await prisma.map.deleteMany({ where: { id: mapId } });
      await gameMap.save({ guildId });
      const locations = await prisma.location.findMany({ where: { mapId } });
      const postLocationIds = new Set(locations.map((l) => l.id));
      const paths = await prisma.path.findMany({ where: { mapId } });
      const postPathEndpointIds = paths.flatMap((
        p,
      ) => [p.fromLocationId, p.toLocationId]);
      // Assertion: all path endpoint IDs must be present in locations
      const missing = postPathEndpointIds.filter((id) =>
        !postLocationIds.has(id)
      );
      if (missing.length > 0) {
        throw new Error(
          `Missing location IDs for paths: ${[...new Set(missing)].join(", ")}`,
        );
      }
    } catch (e) {
      errorCaught = true;
      if (e instanceof Error) {
        console.error("Integration test error:", e.message);
      }
    } finally {
      await prisma.path.deleteMany({ where: { mapId } });
      await prisma.location.deleteMany({ where: { mapId } });
      await prisma.map.deleteMany({ where: { id: mapId } });
    }
    if (errorCaught) {
      throw new Error(
        "Foreign key or save error occurred during integration test",
      );
    }
  },
});
