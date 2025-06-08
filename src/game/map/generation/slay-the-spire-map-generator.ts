import {
  LocationType,
  type Location,
  type Map,
  type Path,
} from "~/game/map/index.ts";

export const slayTheSpireMapGenerator = (opts: {
  cols: number;
  rows: number;
  minNodes?: number;
  maxNodes?: number;
}) => {
  const cols = Number(opts.cols);
  const rows = Number(opts.rows);
  const minNodes = opts.minNodes === undefined ? 2 : Number(opts.minNodes);
  const maxNodes = opts.maxNodes === undefined ? 5 : Number(opts.maxNodes);
  const center = Math.floor(cols / 2);
  const allRows: { row: number; col: number }[][] = Array.from(
    { length: rows },
    (_, i) => (i === 0 || i === rows - 1 ? [{ row: i, col: center }] : [])
  );
  for (let row = 1; row < rows - 1; row++) {
    const count =
      Math.floor(Math.random() * (maxNodes - minNodes + 1)) + minNodes;
    const used = new Set<number>();
    while (allRows[row].length < count) {
      const col = Math.floor(Math.random() * cols);
      if (!used.has(col)) {
        allRows[row].push({ row, col });
        used.add(col);
      }
    }
    allRows[row].sort((a, b) => a.col - b.col);
  }
  const map: Map = {
    cols,
    rows,
    id: crypto.randomUUID(),
    channelId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    currentLocationId: null,
    locationId: null,
    locations: [],
    paths: [],
  };
  const nodeMap = new Map<string, Location>();
  const locations: Location[] = [];
  for (const row of allRows)
    for (const { row: r, col } of row) {
      const id = `${r},${col}`;
      const loc: Location = {
        id,
        row: r,
        col,
        name: `Node ${col},${r}`,
        description: "",
        attributes: {},
        type: LocationType.combat,
        createdAt: new Date(),
        updatedAt: new Date(),
        mapId: map.id,
      };
      nodeMap.set(id, loc);
      locations.push(loc);
    }
  const edgeSet = new Set<string>();
  const crosses = (aFrom: number, aTo: number, bFrom: number, bTo: number) =>
    (aFrom < bFrom && aTo > bTo) || (aFrom > bFrom && aTo < bTo);
  for (let row = 0; row < rows - 1; row++) {
    const fromNodes = allRows[row];
    const toNodes = allRows[row + 1];
    for (const from of fromNodes) {
      const adjacents = toNodes.filter(
        (to) => Math.abs(to.col - from.col) <= 1
      );
      const numTargets = Math.min(2, adjacents.length);
      const targets = [...adjacents]
        .sort(() => Math.random() - 0.5)
        .slice(0, numTargets);
      for (const to of targets) {
        const key = `${from.row},${from.col}->${to.row},${to.col}`;
        const fromCol = from.col,
          toCol = to.col;
        let wouldCross = false;
        for (const e of edgeSet) {
          const [f, t] = e.split("->");
          const [fRow, fCol] = f.split(",").map(Number);
          const [tRow, tCol] = t.split(",").map(Number);
          if (
            fRow === from.row &&
            tRow === to.row &&
            crosses(fromCol, toCol, fCol, tCol)
          ) {
            wouldCross = true;
            break;
          }
        }
        if (!wouldCross) edgeSet.add(key);
      }
    }
  }
  for (let row = 1; row < rows; row++) {
    const toNodes = allRows[row];
    const fromNodes = allRows[row - 1];
    for (const to of toNodes) {
      const hasIncoming = Array.from(edgeSet).some((e) =>
        e.endsWith(`->${to.row},${to.col}`)
      );
      if (!hasIncoming) {
        const adjacents = fromNodes.filter(
          (from) => Math.abs(from.col - to.col) <= 1
        );
        if (adjacents.length > 0) {
          const from = adjacents[Math.floor(Math.random() * adjacents.length)];
          const key = `${from.row},${from.col}->${to.row},${to.col}`;
          const fromCol = from.col,
            toCol = to.col;
          let wouldCross = false;
          for (const e of edgeSet) {
            const [f, t] = e.split("->");
            const [fRow, fCol] = f.split(",").map(Number);
            const [tRow, tCol] = t.split(",").map(Number);
            if (
              fRow === from.row &&
              tRow === to.row &&
              crosses(fromCol, toCol, fCol, tCol)
            ) {
              wouldCross = true;
              break;
            }
          }
          if (!wouldCross) edgeSet.add(key);
        }
      }
    }
  }
  for (let row = 0; row < rows - 1; row++) {
    const fromNodes = allRows[row];
    for (const from of fromNodes) {
      const hasOutgoing = Array.from(edgeSet).some((e) =>
        e.startsWith(`${from.row},${from.col}->`)
      );
      if (!hasOutgoing) {
        const toNodes = allRows[row + 1].filter(
          (to) => Math.abs(to.col - from.col) <= 1
        );
        if (toNodes.length > 0) {
          const to = toNodes[Math.floor(Math.random() * toNodes.length)];
          const key = `${from.row},${from.col}->${to.row},${to.col}`;
          const fromCol = from.col,
            toCol = to.col;
          let wouldCross = false;
          for (const e of edgeSet) {
            const [f, t] = e.split("->");
            const [fRow, fCol] = f.split(",").map(Number);
            const [tRow, tCol] = t.split(",").map(Number);
            if (
              fRow === from.row &&
              tRow === to.row &&
              crosses(fromCol, toCol, fCol, tCol)
            ) {
              wouldCross = true;
              break;
            }
          }
          if (!wouldCross) edgeSet.add(key);
        }
      }
    }
  }
  for (let row = 1; row < rows - 1; row++) {
    for (const node of allRows[row]) {
      const id = `${node.row},${node.col}`;
      const hasIncoming = Array.from(edgeSet).some((e) =>
        e.endsWith(`->${id}`)
      );
      if (!hasIncoming) {
        const prevRow = allRows[row - 1].filter(
          (n) => Math.abs(n.col - node.col) <= 1
        );
        if (prevRow.length > 0) {
          const from = prevRow[Math.floor(Math.random() * prevRow.length)];
          const key = `${from.row},${from.col}->${node.row},${node.col}`;
          edgeSet.add(key);
        }
      }
      const hasOutgoing = Array.from(edgeSet).some((e) =>
        e.startsWith(`${id}->`)
      );
      if (!hasOutgoing) {
        const nextRow = allRows[row + 1].filter(
          (n) => Math.abs(n.col - node.col) <= 1
        );
        if (nextRow.length > 0) {
          const to = nextRow[Math.floor(Math.random() * nextRow.length)];
          const key = `${node.row},${node.col}->${to.row},${to.col}`;
          edgeSet.add(key);
        }
      }
    }
  }
  const paths: Path[] = Array.from(edgeSet).map((s) => {
    const [from, to] = s.split("->");
    return {
      id: crypto.randomUUID(),
      channelId: "",
      fromLocationId: from,
      toLocationId: to,
      description: "",
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      mapId: crypto.randomUUID(),
    };
  });
  return {
    ...map,
    locations,
    paths,
  };
};
