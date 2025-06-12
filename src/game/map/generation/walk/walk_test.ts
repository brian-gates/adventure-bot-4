import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { randomUUID } from "node:crypto";
import { prisma } from "~/db/index.ts";
import { GameMap } from "~/game/map/game-map.ts";
import { logAsciiMap } from "~/game/map/generation/log-ascii-map.ts";
import {
  emptyMap,
  walkStrategy,
  wouldCrossExistingPath,
} from "~/game/map/generation/walk/walk.ts";
import { Location, LocationType, Map, Path } from "~/game/map/index.ts";
import { seededRandom } from "~/game/seeded-random.ts";

const TEST_GUILD_ID = BigInt(1);
const TEST_MAP_ID = "test-map";

Deno.test(
  "emptyMap creates a map with correct dimensions and empty locations/paths",
  () => {
    const rows = 3;
    const cols = 4;
    const map = emptyMap({ cols, rows });

    assertEquals(
      map.cols,
      cols,
      "Map should have the correct number of columns",
    );
    assertEquals(map.rows, rows, "Map should have the correct number of rows");
    assertEquals(
      map.locations.length,
      0,
      "Map locations should be initially empty",
    );
    assertEquals(map.paths.length, 0, "Map paths should be initially empty");
  },
);

Deno.test("emptyMap handles 1x1 dimension", () => {
  const rows = 1;
  const cols = 1;
  const map = emptyMap({ cols, rows });

  assertEquals(map.cols, cols);
  assertEquals(map.rows, rows);
  assertEquals(map.locations.length, 0);
});

Deno.test("emptyMap handles 0 cols", () => {
  const rows = 3;
  const cols = 0;
  const map = emptyMap({ cols, rows });
  assertEquals(map.cols, cols);
  assertEquals(map.rows, rows);
  assertEquals(map.locations.length, 0);
});

Deno.test("emptyMap handles 0 rows", () => {
  const rows = 0;
  const cols = 3;
  const map = emptyMap({ cols, rows });
  assertEquals(map.cols, cols);
  assertEquals(map.rows, rows);
  assertEquals(map.locations.length, 0);
});

Deno.test("walkStrategy creates a complex map with a main path", () => {
  const rows = 5;
  const cols = 5;

  const map = walkStrategy({
    cols,
    rows,
    random: seededRandom(0),
    guildId: TEST_GUILD_ID,
  });

  const startLocation = map.locations.find(
    (loc) => loc.row === 0 && loc.col === Math.floor(cols / 2),
  );
  assertExists(startLocation, "Should have a starting location");

  const bossLocation = map.locations.find((loc) => loc.type === "boss");
  assertExists(bossLocation, "Should have a boss location");

  // Check that the first path segment from the start location exists
  const firstPath = map.paths.find(
    (p) => p.fromLocationId === startLocation.id,
  );
  assertExists(firstPath, "A path should originate from the start location");

  const secondLocation = map.locations.find(
    (l) => l.id === firstPath.toLocationId,
  );
  assertExists(secondLocation);
  assertEquals(
    secondLocation.row,
    1,
    "The first path should lead to a location on row 1",
  );

  // Check that at least one path leads to the boss
  const path_to_boss = map.paths.find(
    (p) => p.toLocationId === bossLocation.id,
  );
  assertExists(
    path_to_boss,
    "There should be at least one path leading to the boss",
  );
});

Deno.test("walkStrategy with 1 row map", () => {
  const rows = 1;
  const cols = 3;
  const map = walkStrategy({
    cols,
    rows,
    random: () => 0.5,
    guildId: TEST_GUILD_ID,
  });
  // With 1 row, start and boss are the same node, no campfires
  assertEquals(map.locations.length, 1);
  assertEquals(map.paths.length, 0);
});

Deno.test(
  "walkStrategy creates locations with varied column positions based on random",
  () => {
    const rows = 4;
    const cols = 5;
    const map = walkStrategy({
      cols,
      rows,
      random: seededRandom(0),
      guildId: TEST_GUILD_ID,
    });

    // Find the true start location, not just the first one in the row
    const startLocation = map.locations.find(
      (l) => l.row === 0 && l.col === Math.floor(cols / 2),
    );
    assertExists(startLocation, "The start location (0,2) must exist.");

    // Find the first path segment from the true start
    const firstPath = map.paths.find(
      (p) => p.fromLocationId === startLocation.id,
    );
    assertExists(firstPath, "Path from start location should exist");

    // Find the next location on that path
    const nextLocation = map.locations.find(
      (l) => l.id === firstPath.toLocationId,
    );
    assertExists(nextLocation, "The location after the start should exist");

    // With seededRandom(0), the first offset is -1 (left)
    assertEquals(nextLocation.row, 1);
    assertEquals(
      nextLocation.col,
      startLocation.col,
      "First step should be straight ahead",
    );
  },
);

Deno.test("ascii view", () => {
  logAsciiMap({
    map: walkStrategy({
      cols: 7,
      rows: 14,
      random: seededRandom(0),
      guildId: TEST_GUILD_ID,
    }),
  });
});

Deno.test("all nodes are connected (no orphans, proper in/out degree)", () => {
  const rows = 7;
  const cols = 7;
  const map = walkStrategy({
    cols,
    rows,
    random: seededRandom(0),
    guildId: TEST_GUILD_ID,
  });

  const bossLocation = map.locations.find((loc) => loc.type === "boss");
  assertExists(bossLocation, "Should have a boss location");
  const startLocation = map.locations.find(
    (loc) => loc.row === 0 && loc.col === Math.floor(cols / 2),
  );
  assertExists(startLocation, "Should have a starting location");

  for (const loc of map.locations) {
    const incoming = map.paths.filter((p) => p.toLocationId === loc.id).length;
    const outgoing = map.paths.filter(
      (p) => p.fromLocationId === loc.id,
    ).length;
    if (loc.id === startLocation.id) {
      // Start node: only outgoing
      assertEquals(
        incoming,
        0,
        `Start node ${loc.id} should have no incoming paths`,
      );
      assertEquals(
        outgoing > 0,
        true,
        `Start node ${loc.id} should have outgoing paths`,
      );
    } else if (loc.id === bossLocation.id) {
      // Boss node: only incoming
      assertEquals(
        outgoing,
        0,
        `Boss node ${loc.id} should have no outgoing paths`,
      );
      assertEquals(
        incoming > 0,
        true,
        `Boss node ${loc.id} should have incoming paths`,
      );
    } else {
      // All other nodes: at least one in and one out
      assertEquals(
        incoming > 0,
        true,
        `Node ${loc.id} should have at least one incoming path`,
      );
      assertEquals(
        outgoing > 0,
        true,
        `Node ${loc.id} should have at least one outgoing path`,
      );
    }
  }
});

Deno.test("wouldcsExistingPath returns false for non-diagonal move", () => {
  const map = createMap({
    locations: [
      createLocation({ id: "A", row: 0, col: 0 }),
      createLocation({ id: "B", row: 1, col: 0 }),
    ],
    paths: [],
  });
  const result = wouldCrossExistingPath({
    from: { row: 0, col: 0 },
    to: { row: 1, col: 0 },
    map,
  });
  assertEquals(result, false);
});

Deno.test(
  "wouldCrossExistingPath returns false if no crossing path exists",
  () => {
    const map = createMap({
      locations: [
        createLocation({
          id: "A",
          row: 0,
          col: 0,
          name: "A",
          type: LocationType.combat,
        }),
        createLocation({
          id: "B",
          row: 1,
          col: 0,
          name: "B",
          type: LocationType.combat,
        }),
        createLocation({
          id: "C",
          row: 0,
          col: 1,
          name: "C",
          type: LocationType.combat,
        }),
      ],
      paths: [],
    });
    const result = wouldCrossExistingPath({
      from: { row: 0, col: 0 },
      to: { row: 1, col: 1 },
      map,
    });
    assertEquals(result, false);
  },
);

Deno.test("wouldCrossExistingPath returns true if crossing path exists", () => {
  const map = createMap({
    locations: [
      createLocation({
        id: "A",
        row: 0,
        col: 0,
        name: "A",
        type: LocationType.combat,
      }),
      createLocation({
        id: "B",
        row: 1,
        col: 0,
        name: "B",
        type: LocationType.combat,
      }),
      createLocation({
        id: "C",
        row: 0,
        col: 1,
        name: "C",
        type: LocationType.combat,
      }),
    ],
    paths: [createPath({ fromLocationId: "B", toLocationId: "C" })],
  });
  const result = wouldCrossExistingPath({
    from: { row: 0, col: 0 },
    to: { row: 1, col: 1 },
    map,
  });
  assertEquals(result, true);
});

Deno.test(
  "wouldCrossExistingPath returns false if adjacent or straightAhead node is missing",
  () => {
    const map = createMap({
      locations: [
        createLocation({ id: "A", row: 0, col: 0 }),
        // missing adjacent and straightAhead
      ],
      paths: [],
    });
    const result = wouldCrossExistingPath({
      from: { row: 0, col: 0 },
      to: { row: 1, col: 1 },
      map,
    });
    assertEquals(result, false);
  },
);

function createMap({
  locations = [],
  paths = [],
  rows = 1,
  cols = 1,
}: Partial<Map> = {}): Map {
  return {
    id: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    rows,
    cols,
    locations,
    paths,
    guildId: null,
    guild: null,
  };
}

function createLocation({
  id = randomUUID(),
  row = 0,
  col = 0,
  name = "A",
  description = "A",
  attributes = {},
  type = LocationType.combat,
}: Partial<Location> = {}): Location {
  return {
    id,
    row,
    col,
    createdAt: new Date(),
    updatedAt: new Date(),
    name,
    description,
    attributes,
    type,
    mapId: TEST_MAP_ID,
  };
}

function createPath({
  id = randomUUID(),
  fromLocationId = randomUUID(),
  toLocationId = randomUUID(),
  createdAt = new Date(),
  updatedAt = new Date(),
  description = "A",
}: Partial<Path> = {}): Path {
  return {
    id,
    fromLocationId,
    toLocationId,
    createdAt,
    updatedAt,
    description,
    attributes: {},
    mapId: TEST_MAP_ID,
  };
}

Deno.test({
  name: "integration: seeding a map creates locations with valid mapId",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    if (!Deno.env.get("DATABASE_URL")) {
      console.log("Skipping integration test: DATABASE_URL not set");
      return;
    }
    // Create a unique map id for isolation
    const mapId = crypto.randomUUID();
    const guildId = BigInt(Math.floor(Math.random() * 1e12));
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
      await gameMap.save({ guildId, prisma });
      // Fetch all locations for this map
      const locations = await prisma.location.findMany({ where: { mapId } });
      // Assert all locations reference the correct mapId
      for (const loc of locations) {
        if (loc.mapId !== mapId) {
          throw new Error(`Location ${loc.id} has wrong mapId: ${loc.mapId}`);
        }
      }
    } catch (e) {
      errorCaught = true;
      if (e instanceof Error) {
        console.error("Integration test error:", e.message);
      }
    } finally {
      // Clean up
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

Deno.test("walkStrategy: all path endpoints exist in locations", () => {
  const map = walkStrategy({
    cols: 7,
    rows: 10,
    random: Math.random,
    guildId: BigInt(1),
  });
  const locationIds = new Set(map.locations.map((l) => l.id));
  const missing = map.paths.flatMap((p) =>
    [p.fromLocationId, p.toLocationId].filter((id) => !locationIds.has(id))
  );
  if (missing.length > 0) {
    throw new Error(
      `walkStrategy: Missing location IDs for paths: ${
        [...new Set(missing)].join(", ")
      }`,
    );
  }
});
