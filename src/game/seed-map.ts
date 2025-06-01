import { PrismaClient } from "~/generated/prisma/client.ts";
import { callLLM } from "~/llm/ollama.ts";

const prisma = new PrismaClient();

type LocationNode = {
  col: number;
  row: number;
  name: string;
  description: string;
  attributes: Record<string, unknown>;
};

type PathEdge = {
  from: number;
  to: number;
  description: string;
  attributes: Record<string, unknown>;
};

const buildGridMap = ({ cols, rows }: { cols: number; rows: number }) => {
  const locations: Omit<LocationNode, "name" | "description" | "attributes">[] =
    [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      locations.push({ col, row });
    }
  }
  // Only keep locations that are reachable (e.g., staggered or randomize)
  // For simplicity, keep all for now
  const paths: Omit<PathEdge, "description" | "attributes">[] = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols; col++) {
      const from = row * cols + col;
      // Connect to 1-2 nodes in next row
      const nextRow = row + 1;
      const targets = [col];
      if (col > 0 && Math.random() > 0.5) targets.push(col - 1);
      if (col < cols - 1 && Math.random() > 0.5) targets.push(col + 1);
      for (const targetCol of targets) {
        const to = nextRow * cols + targetCol;
        if (to < cols * rows) paths.push({ from, to });
      }
    }
  }
  return { locations, paths };
};

const decorateLocations = async ({
  locations,
}: {
  locations: Omit<LocationNode, "name" | "description" | "attributes">[];
}) => {
  console.log(`[seed-map] Decorating ${locations.length} locations with LLM`);
  return Promise.all(
    locations.map(async ({ col, row }) => {
      const prompt = `Generate a fantasy location name and a short description for a map node at column ${
        col + 1
      }, row ${
        row + 1
      }. Return as JSON: { name: string, description: string }.`;
      const raw = await callLLM({ prompt, max_tokens: 128 });
      try {
        const { name, description } = JSON.parse(raw);
        return { col, row, name, description, attributes: {} };
      } catch {
        return {
          col,
          row,
          name: `Node ${col},${row}`,
          description: "",
          attributes: {},
        };
      }
    })
  );
};

const decoratePaths = async ({
  paths,
  locations,
}: {
  paths: Omit<PathEdge, "description" | "attributes">[];
  locations: LocationNode[];
}) => {
  console.log(`[seed-map] Decorating ${paths.length} paths with LLM`);
  return Promise.all(
    paths.map(async ({ from, to }) => {
      const fromLoc = locations[from];
      const toLoc = locations[to];
      const prompt = `Generate a short fantasy description for a path from '${fromLoc.name}' to '${toLoc.name}'. Return as JSON: { description: string }.`;
      const raw = await callLLM({ prompt, max_tokens: 64 });
      try {
        const { description } = JSON.parse(raw);
        return { from, to, description, attributes: {} };
      } catch {
        return { from, to, description: "", attributes: {} };
      }
    })
  );
};

const logAsciiMap = ({
  locations,
  paths,
  cols,
  rows,
}: {
  locations: Omit<LocationNode, "name" | "description" | "attributes">[];
  paths: Omit<PathEdge, "description" | "attributes">[];
  cols: number;
  rows: number;
}) => {
  const edgeMap: Record<
    string,
    { down?: boolean; left?: boolean; right?: boolean }
  > = {};
  paths.forEach(({ from, to }) => {
    const fromRow = Math.floor(from / cols);
    const fromCol = from % cols;
    const toRow = Math.floor(to / cols);
    const toCol = to % cols;
    const key = `${fromRow},${fromCol}`;
    if (!edgeMap[key]) edgeMap[key] = {};
    if (toRow === fromRow + 1) {
      if (toCol === fromCol) edgeMap[key].down = true;
      else if (toCol === fromCol - 1) edgeMap[key].left = true;
      else if (toCol === fromCol + 1) edgeMap[key].right = true;
    }
  });
  let out = "";
  for (let row = 0; row < rows; row++) {
    let nodeLine = "";
    let edgeLine = "";
    for (let col = 0; col < cols; col++) {
      nodeLine += " O ";
      const key = `${row},${col}`;
      const edge = edgeMap[key] || {};
      let edgeChars = "   ";
      if (row < rows - 1) {
        if (edge.left)
          edgeChars = edgeChars.slice(0, 0) + "/" + edgeChars.slice(1);
        if (edge.down)
          edgeChars = edgeChars.slice(0, 1) + "|" + edgeChars.slice(2);
        if (edge.right) edgeChars = edgeChars.slice(0, 2) + "\\";
      }
      edgeLine += edgeChars;
    }
    out += nodeLine + "\n";
    if (row < rows - 1) out += edgeLine + "\n";
  }
  console.log("[seed-map] ASCII map structure:\n" + out);
};

export const seedMapForGuild = async ({ guildId }: { guildId: string }) => {
  console.log(`[seed-map] Seeding map for guild ${guildId}`);
  const existing = await prisma.location.findFirst({
    where: { channelId: guildId },
  });
  if (existing) {
    console.log(`[seed-map] Map already exists for guild ${guildId}`);
    return;
  }
  const cols = 3;
  const rows = 15;
  const { locations: locs, paths: rawPaths } = buildGridMap({ cols, rows });
  logAsciiMap({ locations: locs, paths: rawPaths, cols, rows });
  console.log(
    `[seed-map] Built grid: ${locs.length} locations, ${rawPaths.length} paths`
  );
  // Create all locations in the database first
  const locationIds = locs.map(() => crypto.randomUUID());
  await Promise.all(
    locs.map((loc, i) =>
      prisma.location.create({
        data: {
          id: locationIds[i],
          channelId: guildId,
          name: `Node ${loc.col},${loc.row}`,
          description: "",
          attributes: {},
        },
      })
    )
  );
  // Decorate locations with LLM and update
  const decorated = await decorateLocations({ locations: locs });
  await Promise.all(
    decorated.map((loc, i) =>
      prisma.location.update({
        where: { id: locationIds[i] },
        data: {
          name: loc.name,
          description: loc.description,
          attributes: loc.attributes,
        },
      })
    )
  );
  console.log(`[seed-map] Decorated locations`);
  // Decorate and create paths
  const paths = await decoratePaths({ paths: rawPaths, locations: decorated });
  await Promise.all(
    paths.map((path: PathEdge) =>
      prisma.path.create({
        data: {
          id: crypto.randomUUID(),
          channelId: guildId,
          fromLocationId: locationIds[path.from],
          toLocationId: locationIds[path.to],
          description: path.description,
          attributes: path.attributes,
        },
      })
    )
  );
  await prisma.guildState.upsert({
    where: { guildId },
    update: { currentLocationId: locationIds[0] },
    create: { guildId, currentLocationId: locationIds[0] },
  });
  console.log(`[seed-map] Map seeded for guild ${guildId}`);
};
