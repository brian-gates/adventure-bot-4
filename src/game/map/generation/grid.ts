import type { MapGenerator } from "~/game/map/index.ts";
import type { Location, Path } from "~/generated/prisma/client.ts";

const defaultNode = (
  col: number,
  row: number,
  mapId: string,
): Omit<Location, "name" | "id"> => ({
  col,
  row,
  type: "combat",
  description: "",
  attributes: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  mapId,
});

const gridStrategy: MapGenerator = ({
  cols = 7,
  rows = 15,
  random,
  guildId,
}) => {
  const mapId = crypto.randomUUID();
  const nodeGrid: (Omit<Location, "name" | "id"> | null)[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowNodes: (Omit<Location, "name" | "id"> | null)[] = [];
    if (row === 0 || row === rows - 1) {
      const centerCol = Math.floor(cols / 2);
      for (let c = 0; c < cols; c++) {
        rowNodes.push(c === centerCol ? defaultNode(c, row, mapId) : null);
      }
    } else {
      let nodeCount = 0;
      for (let col = 0; col < cols; col++) {
        const place = random() < 0.7 || (col === cols - 1 && nodeCount === 0);
        if (place) {
          rowNodes.push(defaultNode(col, row, mapId));
          nodeCount++;
        } else {
          rowNodes.push(null);
        }
      }
      if (nodeCount === 0) {
        const forcedCol = Math.floor(random() * cols);
        rowNodes[forcedCol] = defaultNode(forcedCol, row, mapId);
      }
    }
    nodeGrid.push(rowNodes);
  }
  const locations: Location[] = [];
  const nodeIndexGrid: (number | null)[][] = nodeGrid.map((row) =>
    row.map((cell) =>
      cell
        ? locations.push({
          ...cell,
          name: `Node ${cell.col},${cell.row}`,
          id: `${cell.row},${cell.col}`,
        }) - 1
        : null
    )
  );
  const paths: Path[] = [];
  for (let row = 0; row < rows - 1; row++) {
    const thisRow = nodeIndexGrid[row];
    const nextRow = nodeIndexGrid[row + 1];
    for (let col = 0; col < cols; col++) {
      const fromIdx = thisRow[col];
      if (fromIdx === null) continue;
      const targets: number[] = [];
      for (let d = -1; d <= 1; d++) {
        const ncol = col + d;
        if (ncol >= 0 && ncol < cols && nextRow[ncol] !== null) {
          targets.push(nextRow[ncol]!);
        }
      }
      if (targets.length > 0) {
        if (nextRow[col] !== null) {
          paths.push({
            fromLocationId: locations[fromIdx].id,
            toLocationId: locations[nextRow[col]!].id,
            id: `${locations[fromIdx].id}->${locations[nextRow[col]!].id}`,
            description: "",
            attributes: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            mapId,
          });
        } else {
          const toIdx = targets[Math.floor(Math.random() * targets.length)];
          paths.push({
            fromLocationId: locations[fromIdx].id,
            toLocationId: locations[toIdx].id,
            id: `${locations[fromIdx].id}->${locations[toIdx].id}`,
            description: "",
            attributes: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            mapId,
          });
        }
        for (const t of targets) {
          if (t !== nextRow[col] && Math.random() < 0.4) {
            paths.push({
              fromLocationId: locations[fromIdx].id,
              toLocationId: locations[t].id,
              id: `${locations[fromIdx].id}->${locations[t].id}`,
              description: "",
              attributes: {},
              createdAt: new Date(),
              updatedAt: new Date(),
              mapId,
            });
          }
        }
      }
    }
  }
  return {
    locations,
    paths,
    cols,
    rows,
    guildId,
    id: mapId,
    createdAt: new Date(),
    updatedAt: new Date(),
    guild: null,
  };
};

export { gridStrategy };
