import { assertSnapshot } from "https://deno.land/std@0.224.0/testing/snapshot.ts";
import type { Map, Position } from "~/game/map/index.ts";
import { canReachTargetFromPosition } from "./can-reach-target-from-position.ts";

const start = { row: 0, col: 3 };
const boss = { row: 14, col: 3 };

Deno.test("canReachTargetFromPosition to boss", (t) => {
  assertSnapshot(
    t,
    gridMap({
      map: createMap({
        rows: 10,
        cols: 10,
      }),
      target: boss,
    }),
  );
});

Deno.test("canReachTargetFromPosition to start", (t) => {
  assertSnapshot(
    t,
    gridMap({
      map: createMap({
        rows: 10,
        cols: 10,
      }),
      target: start,
    }),
  );
});

Deno.test("canReachTargetFromPosition: 10x10", (t) => {
  assertSnapshot(
    t,
    gridMap({
      map: createMap({
        rows: 10,
        cols: 10,
      }),
      target: {
        row: 5,
        col: 5,
      },
    }),
  );
});

Deno.test("canReachTargetFromPosition: 10x10 reverse", (t) => {
  const map = createMap({
    rows: 10,
    cols: 10,
  });
  assertSnapshot(t, gridMap({ map, target: start }));
});

function createMap({
  rows = 15,
  cols = 7,
  locations = [],
  paths = [],
  guild = null,
  id = "test-map",
  createdAt = new Date(),
  updatedAt = new Date(),
  guildId = null,
}: Partial<Map> = {}): Map {
  return {
    rows,
    cols,
    locations,
    paths,
    guild,
    id,
    createdAt,
    updatedAt,
    guildId,
  };
}

function gridMap({
  map,
  target,
}: {
  map: Map;
  target: Position;
}) {
  let output = "";
  for (let row = 0; row < map.rows; row++) {
    let line = "";
    for (let col = 0; col < map.cols; col++) {
      const valid = canReachTargetFromPosition({
        target,
        position: { row, col },
      });
      line += valid ? "O" : ".";
    }
    output += line + "\n";
  }
  return output;
}
