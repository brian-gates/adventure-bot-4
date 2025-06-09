import { LocationType, type MapGenerator } from "~/game/map/index.ts";

export const trailblazingStrategy: MapGenerator = ({
  cols = 7,
  rows = 15,
  minNodes = 2,
  maxNodes = 5,
  random,
  guildId,
}) => {
  const mapId = crypto.randomUUID();
  const center = Math.floor(cols / 2);
  const boss = { row: rows - 1, col: center };
  const campfireRow = rows - 2;

  // Ensure campfires are adjacent to the boss column for valid connections
  const potentialCampfireCols = [center];
  if (cols > 1) {
    // Only add adjacent if there's space
    if (center - 1 >= 0) potentialCampfireCols.unshift(center - 1);
    if (center + 1 < cols) potentialCampfireCols.push(center + 1);
  }
  // Take up to 3 distinct columns, prioritizing center, then left, then right
  const campfireCols = [...new Set(potentialCampfireCols)].slice(0, 3);
  // Ensure at least one campfire, even if cols is small (it will be the center one)
  if (campfireCols.length === 0 && cols > 0) campfireCols.push(center);

  const campfires = campfireCols.map((col) => ({ row: campfireRow, col }));

  const allRows: { row: number; col: number }[][] = Array.from(
    { length: rows },
    () => []
  );
  allRows[0] = [{ row: 0, col: center }];
  allRows[rows - 1] = [{ row: rows - 1, col: center }];
  allRows[campfireRow] = campfireCols.map((col) => ({ row: campfireRow, col }));

  const randomAdjacent = (col: number) => {
    const moves = [-1, 0, 1].filter((d) => col + d >= 0 && col + d < cols);
    return col + moves[Math.floor(random() * moves.length)];
  };

  campfireCols.forEach((campfireCol) => {
    let col = campfireCol;
    for (let row = campfireRow - 1; row > 0; row--) {
      col = randomAdjacent(col);
      if (!allRows[row].some((n) => n.col === col)) {
        allRows[row] = [...allRows[row], { row, col }];
      }
    }
  });

  for (let row = 1; row < rows - 1; row++) {
    const existing = allRows[row].map((n) => n.col);
    const needed = Math.max(minNodes - existing.length, 0);
    const availableCols = Array.from({ length: cols }, (_, i) => i).filter(
      (c) => !existing.includes(c)
    );
    const extraCols = availableCols
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(needed, maxNodes - existing.length));
    allRows[row] = [
      ...allRows[row],
      ...extraCols.map((col) => ({ row, col })),
    ].sort((a, b) => a.col - b.col);
  }

  const nodeSet = new Set<string>();
  allRows.forEach((rowNodes) =>
    rowNodes.forEach((n) => nodeSet.add(`${n.row},${n.col}`))
  );

  const edgeSet = new Set<string>(
    campfires.map((cf) => `${cf.row},${cf.col}->${boss.row},${boss.col}`)
  );

  for (let row = 0; row < rows - 1; row++) {
    const fromNodes = allRows[row];
    const toNodes = allRows[row + 1];
    fromNodes.forEach((from) => {
      const adjacents = toNodes.filter(
        (to) => Math.abs(to.col - from.col) <= 1
      );
      if (adjacents.length > 0) {
        const to = adjacents[Math.floor(random() * adjacents.length)];
        edgeSet.add(`${from.row},${from.col}->${to.row},${to.col}`);
      }
    });
  }
  for (let row = 1; row < rows; row++) {
    const toNodes = allRows[row];
    const fromNodes = allRows[row - 1];
    toNodes.forEach((to) => {
      const hasIncoming = Array.from(edgeSet).some((e) =>
        e.endsWith(`->${to.row},${to.col}`)
      );
      if (!hasIncoming) {
        const adjacents = fromNodes.filter(
          (from) => Math.abs(from.col - to.col) <= 1
        );
        if (adjacents.length > 0) {
          const from = adjacents[Math.floor(random() * adjacents.length)];
          edgeSet.add(`${from.row},${from.col}->${to.row},${to.col}`);
        }
      }
    });
  }

  // Final pass to ensure all nodes (except start/boss) have incoming/outgoing edges
  for (let row = 1; row < rows - 1; row++) {
    const nodes = allRows[row];
    const prevNodes = allRows[row - 1];
    const nextNodes = allRows[row + 1];
    nodes.forEach((node) => {
      const id = `${node.row},${node.col}`;
      const hasIncoming = Array.from(edgeSet).some((e) =>
        e.endsWith(`->${id}`)
      );
      if (!hasIncoming && prevNodes.length > 0) {
        const adj = prevNodes.filter((n) => Math.abs(n.col - node.col) <= 1);
        if (adj.length > 0) {
          const from = adj[Math.floor(random() * adj.length)];
          edgeSet.add(`${from.row},${from.col}->${node.row},${node.col}`);
        }
      }
      const hasOutgoing = Array.from(edgeSet).some((e) =>
        e.startsWith(`${id}->`)
      );
      if (!hasOutgoing && nextNodes.length > 0) {
        const adj = nextNodes.filter((n) => Math.abs(n.col - node.col) <= 1);
        if (adj.length > 0) {
          const to = adj[Math.floor(random() * adj.length)];
          edgeSet.add(`${node.row},${node.col}->${to.row},${to.col}`);
        }
      }
    });
  }

  const locations = Array.from(nodeSet).map((s) => {
    const [row, col] = s.split(",").map(Number);
    let type: LocationType = LocationType.combat;
    if (row === 0 && col === center) type = LocationType.combat;
    if (row === rows - 1 && col === center) type = LocationType.boss;
    if (row === campfireRow && campfireCols.includes(col)) {
      type = LocationType.campfire;
    }
    return {
      id: s,
      row,
      col,
      name: `Node ${col},${row}`,
      description: "",
      attributes: {},
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
      mapId,
    };
  });

  const paths = Array.from(edgeSet).map((s) => {
    const [from, to] = s.split("->");
    return {
      id: crypto.randomUUID(),
      fromLocationId: from,
      toLocationId: to,
      description: "",
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      mapId,
    };
  });

  return {
    locations,
    paths,
    cols,
    rows,
    guildId,
    id: mapId,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentLocationId: locations[0].id,
    locationId: locations[0].id,
  };
};
