import { Location, LocationType, Path } from "~/generated/prisma/client.ts";
import { assignLocationTypes } from "./assign-location-types.ts";

function generateMap({ cols, rows }: { cols: number; rows: number }) {
  let id = 0;
  const locations: Location[] = [];
  for (let row = 0; row < rows; row++) {
    const nodeCount = Math.max(2, Math.floor(Math.random() * (cols - 1)) + 2);
    const usedCols = Array.from({ length: cols }, (_, i) => i)
      .sort(() => 0.5 - Math.random())
      .slice(0, nodeCount)
      .sort((a, b) => a - b);
    for (const col of usedCols) {
      locations.push({
        id: `${row},${col},${id++}`,
        col,
        row,
        name: `N${row},${col}`,
        description: "",
        attributes: {},
        type: LocationType.combat,
        createdAt: new Date(),
        updatedAt: new Date(),
        mapId: "demo",
      });
    }
  }
  const paths: Path[] = [];
  for (let row = 0; row < rows - 1; row++) {
    const fromNodes = locations.filter((l) => l.row === row);
    const toNodes = locations.filter((l) => l.row === row + 1);
    for (const from of fromNodes) {
      for (const to of toNodes) {
        if (Math.abs(from.col - to.col) <= 1) {
          paths.push({
            fromLocationId: from.id,
            toLocationId: to.id,
            id: `${from.id}-${to.id}`,
            description: "",
            attributes: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            mapId: "demo",
          });
        }
      }
    }
  }
  return { locations, paths };
}

for (const cols of [4, 5, 6, 7]) {
  for (const rows of [8, 10, 12, 15]) {
    for (let seed = 1; seed <= 5; seed++) {
      const { locations, paths } = generateMap({ cols, rows });
      const { locations: typed } = assignLocationTypes(
        { locations, paths },
        { seed }
      );
      const byRow = typed.reduce<Record<number, typeof typed>>((acc, l) => {
        acc[l.row] = acc[l.row] ? [...acc[l.row], l] : [l];
        return acc;
      }, {});
      for (const row of Object.keys(byRow).map(Number)) {
        const events = byRow[row].filter((l) => l.type === "event");
        if (row === 0 || row === Math.max(...Object.keys(byRow).map(Number))) {
          if (events.length !== 0) {
            console.error({
              cols,
              rows,
              seed,
              row,
              events,
              byRow: byRow[row],
              typed,
            });
            throw new Error(`Row ${row} should have 0 events`);
          }
        } else {
          if (!(events.length <= 1)) {
            console.error({
              cols,
              rows,
              seed,
              row,
              events,
              byRow: byRow[row],
              typed,
            });
            throw new Error(`Row ${row} should have at most 1 event`);
          }
          if (byRow[row].length === 2 && !(events.length < 2)) {
            console.error({
              cols,
              rows,
              seed,
              row,
              events,
              byRow: byRow[row],
              typed,
            });
            throw new Error(
              `Row ${row} with 2 nodes should have less than 2 events`
            );
          }
          const prev = byRow[row - 1] || [];
          const next = byRow[row + 1] || [];
          for (const e of events) {
            if (!prev.every((l) => l.type !== "event")) {
              console.error({ cols, rows, seed, row, e, prev, typed });
              throw new Error(`Previous row has event for row ${row}`);
            }
            if (!next.every((l) => l.type !== "event")) {
              console.error({ cols, rows, seed, row, e, next, typed });
              throw new Error(`Next row has event for row ${row}`);
            }
          }
        }
      }
      const elite = typed.filter((l) => l.type === "elite");
      if (!(elite.length >= 1)) {
        console.error({ cols, rows, seed, elite, typed });
        throw new Error(`Should have at least 1 elite`);
      }
      for (const l of elite) {
        if (!(l.row > 1)) {
          console.error({ cols, rows, seed, l, typed });
          throw new Error(`Elite row should be > 1`);
        }
        if (!(l.row < Math.max(...Object.keys(byRow).map(Number)) - 1)) {
          console.error({ cols, rows, seed, l, typed });
          throw new Error(`Elite row should be < maxRow - 1`);
        }
        if (!(byRow[l.row].filter((x) => x.type === "elite").length === 1)) {
          console.error({ cols, rows, seed, l, byRow: byRow[l.row], typed });
          throw new Error(`Only one elite per row`);
        }
        const prev = byRow[l.row - 1] || [];
        const next = byRow[l.row + 1] || [];
        if (!prev.every((x) => x.type !== "elite")) {
          console.error({ cols, rows, seed, l, prev, typed });
          throw new Error(`Previous row has elite for row ${l.row}`);
        }
        if (!next.every((x) => x.type !== "elite")) {
          console.error({ cols, rows, seed, l, next, typed });
          throw new Error(`Next row has elite for row ${l.row}`);
        }
      }
      const taverns = typed.filter((l) => l.type === "tavern");
      if (!(taverns.length >= 1)) {
        console.error({ cols, rows, seed, taverns, typed });
        throw new Error(`Should have at least 1 tavern`);
      }
      for (const l of taverns) {
        if (!(l.row > 0)) {
          console.error({ cols, rows, seed, l, typed });
          throw new Error(`Tavern row should be > 0`);
        }
        if (!(l.row < Math.max(...Object.keys(byRow).map(Number)))) {
          console.error({ cols, rows, seed, l, typed });
          throw new Error(`Tavern row should be < maxRow`);
        }
        const prev = byRow[l.row - 1] || [];
        const next = byRow[l.row + 1] || [];
        if (!prev.every((x) => x.type !== "tavern")) {
          console.error({ cols, rows, seed, l, prev, typed });
          throw new Error(`Previous row has tavern for row ${l.row}`);
        }
        if (!next.every((x) => x.type !== "tavern")) {
          console.error({ cols, rows, seed, l, next, typed });
          throw new Error(`Next row has tavern for row ${l.row}`);
        }
        if (!prev.every((x) => x.type !== "elite")) {
          console.error({ cols, rows, seed, l, prev, typed });
          throw new Error(`Previous row has elite for tavern row ${l.row}`);
        }
        if (!next.every((x) => x.type !== "elite")) {
          console.error({ cols, rows, seed, l, next, typed });
          throw new Error(`Next row has elite for tavern row ${l.row}`);
        }
        if (!byRow[l.row].every((x) => x.type !== "elite")) {
          console.error({ cols, rows, seed, l, byRow: byRow[l.row], typed });
          throw new Error(`Tavern row has elite`);
        }
        if (
          byRow[l.row].length === 2 &&
          !(byRow[l.row].filter((x) => x.type === "tavern").length < 2)
        ) {
          console.error({ cols, rows, seed, l, byRow: byRow[l.row], typed });
          throw new Error(`Row with 2 nodes should have less than 2 taverns`);
        }
      }
      console.log(`Success: map ${cols}x${rows} seed ${seed}`);
    }
  }
}
