import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { logAsciiMap } from "~/game/map/seed-map.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import type { Location } from "~/generated/prisma/client.ts";
import { LocationType } from "~/generated/prisma/enums.ts";
import type { Map } from "./index.ts";
import { addPath, emptyMap } from "./walk.ts";

Deno.test(
  "emptyMap creates a map with correct dimensions and empty locations/paths",
  () => {
    const rows = 3;
    const cols = 4;
    const map = emptyMap({ cols, rows });

    assertEquals(
      map.cols,
      cols,
      "Map should have the correct number of columns"
    );
    assertEquals(map.rows, rows, "Map should have the correct number of rows");
    assertEquals(
      map.locations.length,
      0,
      "Map locations should be initially empty"
    );
    assertEquals(map.paths.length, 0, "Map paths should be initially empty");
  }
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

Deno.test("addPath handles a 1xN map (vertical path)", () => {
  const rows = 3;
  const cols = 1;

  const originalMathRandom = Math.random;
  Math.random = () => 0; // Deterministic randomWalk (hopefully straight)

  const mapWithPath = addPath({
    map: emptyMap({ cols, rows }),
    random: seededRandom(0),
  });
  Math.random = originalMathRandom;

  assertEquals(
    mapWithPath.locations.length,
    3,
    "Should have 3 locations for a 3x1 path"
  );
  mapWithPath.locations.forEach((loc, i) => {
    assertEquals(loc.type, LocationType.combat);
    assertEquals(loc.row, i); // 0, 1, 2
    assertEquals(loc.col, 0);
  });
  logAsciiMap(mapWithPath);
});

Deno.test(
  "addPath combines new path locations with existing ones (no overlap)",
  () => {
    const rows = 3;
    const cols = 3;
    const existingLocation: Location = {
      id: "existing_0_0",
      channelId: "ch",
      row: 0,
      col: 0,
      type: LocationType.event,
      name: "E",
      description: "D",
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const initialMap: Map = {
      cols,
      rows,
      locations: [existingLocation],
      paths: [],
    };

    const mapWithPath = addPath({ map: initialMap, random: seededRandom(0) });

    assertEquals(
      mapWithPath.locations.length,
      1 + 3,
      "Should have initial location + 3 path locations"
    );

    const eventLoc = mapWithPath.locations.find(
      (l) => l.type === LocationType.event
    );
    assertExists(eventLoc);
    assertEquals(eventLoc?.id, "existing_0_0");

    const combatLocs = mapWithPath.locations.filter(
      (l) => l.type === LocationType.combat
    );
    assertEquals(combatLocs.length, 3);
    combatLocs.forEach((cl) => assertEquals(cl.col, 1));
  }
);

Deno.test("addPath replaces existing location if path overlaps", () => {
  const rows = 3;
  const cols = 3;
  const existingLocation: Location = {
    id: "existing_1_1",
    channelId: "ch",
    row: 1,
    col: 1,
    type: LocationType.event,
    name: "E",
    description: "D",
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const initialMap: Map = {
    cols,
    rows,
    locations: [existingLocation],
    paths: [],
  };

  const mapWithPath = addPath({ map: initialMap, random: seededRandom(0) });

  assertEquals(
    mapWithPath.locations.length,
    3,
    "Should have 3 locations in total (1 replaced, 2 new)"
  );

  const overlappingLoc = mapWithPath.locations.find(
    (l) => l.row === 1 && l.col === 1
  );
  assertExists(overlappingLoc);
  assertEquals(
    overlappingLoc?.type,
    LocationType.combat,
    "Overlapping location should be replaced by combat type"
  );
  assert(
    overlappingLoc.id.startsWith("pathloc_"),
    "ID of replaced location should be new"
  );

  const otherCombatLocs = mapWithPath.locations.filter(
    (l) => l.type === LocationType.combat && !(l.row === 1 && l.col === 1)
  );
  assertEquals(otherCombatLocs.length, 2);
});
