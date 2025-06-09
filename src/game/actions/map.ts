import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import type { Location, LocationType, Map } from "~/game/map/index.ts";
import { locationTypeImage } from "~/game/map/locations/location-type-image.ts";
import { seedMapForGuild } from "~/game/map/seed-map.ts";

const WIDTH = 600;
const HEIGHT = 1800;
// const NODE_RADIUS = 28;

const iconDominantColors: Record<LocationType, string> = {
  boss: "#ac04a4",
  combat: "#447404",
  elite: "#ac0404",
  tavern: "#8c542c",
  treasure: "#b47404",
  event: "#b40474",
  campfire: "#04b4b4",
  shop: "#9013FE",
};

function getContrastBg(hex: string) {
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
}

async function getMap(guildId: bigint) {
  const guild = await prisma.guild.findUnique({
    where: { guildId },
    include: {
      map: {
        include: {
          locations: true,
          paths: true,
        },
      },
    },
  });
  if (!guild?.map) {
    const map = await seedMapForGuild({ guildId });
    return map;
  }
  return guild.map;
}

function renderMapSvg({
  locations,
  paths,
  currentLocationId,
  cols,
  rows,
}: Map) {
  // Padding around the map
  const PAD_X = 40;
  const PAD_Y = 40;
  // Use cols/rows to scale node positions to SVG size
  const gridW = Math.max(1, (cols ?? 7) - 1);
  const gridH = Math.max(1, (rows ?? 15) - 1);
  const scaleX = (WIDTH - 2 * PAD_X) / gridW;
  const scaleY = (HEIGHT - 2 * PAD_Y) / gridH;
  const nodeRadius = Math.min(scaleX, scaleY) * 0.18;
  const iconSize = nodeRadius * 2 * 0.7;

  const nodePos = (loc: Location) => ({
    x: PAD_X + loc.col * scaleX,
    y: PAD_Y + (rows - 1 - loc.row) * scaleY,
  });

  let svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}'>`;
  for (const path of paths) {
    const from = locations.find((l) => l.id === path.fromLocationId);
    const to = locations.find((l) => l.id === path.toLocationId);
    if (from && to) {
      const { x: x1, y: y1 } = nodePos(from);
      const { x: x2, y: y2 } = nodePos(to);
      svg +=
        `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='#888' stroke-width='2'/>`;
    }
  }
  for (const loc of locations) {
    const { x, y } = nodePos(loc);
    const dominant =
      iconDominantColors[loc.type as keyof typeof iconDominantColors] ??
        "#00FF00";
    const bg = getContrastBg(dominant);
    const isCurrent = currentLocationId && loc.id === currentLocationId;
    const stroke = isCurrent ? "#FFD700" : dominant;
    const strokeWidth = isCurrent ? 4 : 2;
    svg +=
      `<circle cx='${x}' cy='${y}' r='${nodeRadius}' fill='${bg}' stroke='${stroke}' stroke-width='${strokeWidth}'/>`;
    const icon = locationTypeImage[loc.type];
    if (!icon) {
      console.warn(`Missing icon for node type: ${loc.type}`);
      svg +=
        `<text x="${x}" y="${y}" fill="#fff" font-size="10" text-anchor="middle" alignment-baseline="middle">${
          loc.type[0]
        }</text>`;
    } else {
      svg += `<image href='${icon}' x='${x - iconSize / 2}' y='${
        y - iconSize / 2
      }' width='${iconSize}' height='${iconSize}' />`;
    }
  }
  svg += `</svg>`;
  return svg;
}

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
  const guildId = interaction.guildId;
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
  const map = await getMap(guildId);
  if (!map) {
    console.log(`[map] No map found for guild ${guildId}`);
    try {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: "No map found for this server.",
      });
    } catch (err) {
      console.error(`[map] Error sending no-map response:`, err);
    }
    return;
  }
  const svg = renderMapSvg(map);
  const png = await rasterizeSvgToPng(svg);
  if (interaction.channelId) {
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
        err,
      );
    }
  } else {
    console.log(`[map] No channelId found for interaction`);
  }
}

export { rasterizeSvgToPng, renderMapSvg };
