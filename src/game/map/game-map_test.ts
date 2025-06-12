import { prisma } from "~/db/index.ts";
import { GameMap } from "./game-map.ts";
import { walkStrategy } from "./generation/walk/walk-strategy.ts";

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
      await prisma.$transaction(async (tx) => {
        await tx.map.deleteMany({ where: { id: mapId } });
        await gameMap.save({ guildId, prisma: prisma });
        const locations = await tx.location.findMany({ where: { mapId } });
        const postLocationIds = new Set(locations.map((l) => l.id));
        const paths = await tx.path.findMany({ where: { mapId } });
        const postPathEndpointIds = paths.flatMap((
          p,
        ) => [p.fromLocationId, p.toLocationId]);
        // Assertion: all path endpoint IDs must be present in locations
        const missing = postPathEndpointIds.filter((id) =>
          !postLocationIds.has(id)
        );
        if (missing.length > 0) {
          throw new Error(
            `Missing location IDs for paths: ${
              [...new Set(missing)].join(", ")
            }`,
          );
        }
        // Assert getNextLocations from the starting position returns outbound paths
        const startCol = Math.floor(mapData.cols / 2);
        const startLoc = gameMap.locations.find((l) =>
          l.row === 0 && l.col === startCol
        );
        if (!startLoc) throw new Error("No start location found");
        const nextLocations = gameMap.getNextLocations({ id: startLoc.id });
        if (!nextLocations.length) {
          throw new Error(
            "getNextLocations from start returns no outbound locations",
          );
        }
        // Assert gameMap.startLocation matches the expected start node
        if (!gameMap.startLocation) {
          throw new Error("gameMap.startLocation is null");
        }
        if (
          gameMap.startLocation.row !== 0 ||
          gameMap.startLocation.col !== startCol
        ) {
          throw new Error(
            `gameMap.startLocation is not at (0, ${startCol}), got (${gameMap.startLocation.row}, ${gameMap.startLocation.col})`,
          );
        }
        // Force rollback
        throw new Error("ROLLBACK");
      });
    } catch (e) {
      // Only treat as error if not our forced rollback
      if (e instanceof Error && e.message === "ROLLBACK") {
        errorCaught = false;
      } else {
        errorCaught = true;
        if (e instanceof Error) {
          console.error("Integration test error:", e.message);
        }
      }
    }
    if (errorCaught) {
      throw new Error(
        "Foreign key or save error occurred during integration test",
      );
    }
  },
});
