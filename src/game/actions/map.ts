import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import {
  $Enums,
  Location,
  Path,
  PrismaClient,
} from "~/generated/prisma/client.ts";
import { locationTypeImage } from "../location-type-image.ts";

const prisma = new PrismaClient();

const WIDTH = 600;
const HEIGHT = 1800;
const NODE_RADIUS = 28;

const iconDominantColors: Record<$Enums.LocationType, string> = {
  boss: "#ac04a4",
  combat: "#447404",
  elite: "#ac0404",
  tavern: "#8c542c",
  treasure: "#b47404",
  event: "#b40474",
  campfire: "#04b4b4",
};

const getContrastBg = (hex: string) => {
  // Remove # if present
  hex = hex.replace("#", "");
  // Parse r, g, b
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? "#111" : "#fff";
};

const getMapData = async (guildId: string) => {
  console.log(`[map] Querying locations and paths for guild ${guildId}`);
  const locations = await prisma.location.findMany({
    where: { channelId: guildId },
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });
  const paths = await prisma.path.findMany({
    where: { channelId: guildId },
  });
  console.log(
    `[map] Found ${locations.length} locations, ${paths.length} paths`
  );
  return { locations, paths };
};

const renderMapSvg = ({
  locations,
  paths,
  cols,
  rows,
  currentLocationId,
}: {
  locations: Location[];
  paths: Path[];
  cols: number;
  rows: number;
  currentLocationId?: string;
}) => {
  const nodePos = (loc: Location) => {
    const x = loc.col * (WIDTH / (cols + 1)) + WIDTH / (cols + 1);
    const y = loc.row * (HEIGHT / (rows + 1)) + HEIGHT / (rows + 1);
    return { x, y };
  };
  let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}'><rect width='100%' height='100%' fill='#fff'/>`;
  for (const path of paths) {
    const from = locations.find((l) => l.id === path.fromLocationId);
    const to = locations.find((l) => l.id === path.toLocationId);
    if (from && to) {
      const { x: x1, y: y1 } = nodePos(from);
      const { x: x2, y: y2 } = nodePos(to);
      svg += `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='#888' stroke-width='2'/>`;
    }
  }
  for (const loc of locations) {
    const { x, y } = nodePos(loc);
    const dominant =
      iconDominantColors[loc.type as keyof typeof iconDominantColors] ??
      "#3498db";
    const bg = getContrastBg(dominant);
    const isCurrent = currentLocationId && loc.id === currentLocationId;
    const stroke = isCurrent ? "#FFD700" : dominant;
    const strokeWidth = isCurrent ? 8 : 4;
    svg += `<circle cx='${x}' cy='${y}' r='${NODE_RADIUS}' fill='${bg}' stroke='${stroke}' stroke-width='${strokeWidth}'/>`;
    const iconUrl =
      locationTypeImage[loc.type as keyof typeof locationTypeImage];
    if (iconUrl) {
      svg += `<image href='${iconUrl}' x='${x - 20}' y='${
        y - 20
      }' width='40' height='40' />`;
    }
  }
  svg += `</svg>`;
  return svg;
};

const rasterizeSvgToPng = async (svg: string): Promise<Uint8Array> => {
  const p = new Deno.Command("rsvg-convert", {
    args: ["-f", "png"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = p.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(svg));
  await writer.close();
  const { code, stdout, stderr } = await child.output();
  if (code !== 0) {
    throw new Error(`rsvg-convert failed: ${new TextDecoder().decode(stderr)}`);
  }
  return new Uint8Array(stdout);
};

export async function map({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  console.log(`[map] /map command handler called`);
  const guildId = interaction.guildId?.toString();
  if (!guildId) {
    console.log(`[map] No guildId found for interaction`);
    try {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: "This command can only be used in a server.",
      });
    } catch (err) {
      console.error(`[map] Error sending no-guildId response:`, err);
    }
    return;
  }
  let locations, paths;
  try {
    const data = await getMapData(guildId);
    locations = data.locations;
    paths = data.paths;
  } catch (err) {
    console.error(`[map] Error in getMapData for guild ${guildId}:`, err);
    try {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: `Error loading map data: ${err}`,
      });
    } catch (e) {
      console.error(`[map] Error sending error response:`, e);
    }
    return;
  }
  // Determine cols and rows from locations
  const cols =
    locations.length > 0
      ? Math.max(...locations.map((l: Location) => l.col)) + 1
      : 1;
  const rows =
    locations.length > 0
      ? Math.max(...locations.map((l: Location) => l.row)) + 1
      : 1;
  let svg;
  try {
    svg = renderMapSvg({ locations, paths, cols, rows });
  } catch (err) {
    console.error(`[map] Error in renderMapSvg:`, err);
    try {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: `Error rendering map SVG: ${err}`,
      });
    } catch (e) {
      console.error(`[map] Error sending error response:`, e);
    }
    return;
  }
  let png;
  try {
    png = await rasterizeSvgToPng(svg);
  } catch (err) {
    console.error(`[map] Error rasterizing SVG to PNG:`, err);
    png = null;
  }
  try {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "Here is your map:",
    });
  } catch (err) {
    console.error(`[map] Error editing original interaction response:`, err);
  }
  if (interaction.channelId) {
    console.log(`[map] Sending map image to channel ${interaction.channelId}`);
    try {
      if (png) {
        await bot.helpers.sendMessage(interaction.channelId, {
          file: [
            { blob: new Blob([png], { type: "image/png" }), name: "map.png" },
          ],
        });
      } else {
        await bot.helpers.sendMessage(interaction.channelId, {
          file: [
            {
              blob: new Blob([svg], { type: "image/svg+xml" }),
              name: "map.svg",
            },
          ],
        });
      }
    } catch (err) {
      console.error(
        `[map] Error sending map image to channel ${interaction.channelId}:`,
        err
      );
    }
  } else {
    console.log(`[map] No channelId found for interaction`);
  }
}

export { renderMapSvg };
