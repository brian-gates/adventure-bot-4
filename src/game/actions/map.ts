import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { GameMap } from "~/game/map/game-map.ts";
import type { LocationType } from "~/game/map/index.ts";
import { prisma } from "../../db/index.ts";
import { renderMapSvg } from "./render-map-svg.ts";
import { svgToPing } from "./svg-to-png.ts";

export const WIDTH = 600;
export const HEIGHT = 1800;

export const iconDominantColors: Record<LocationType, string> = {
  boss: "#ac04a4",
  combat: "#447404",
  elite: "#ac0404",
  tavern: "#8c542c",
  treasure: "#b47404",
  event: "#b40474",
  campfire: "#04b4b4",
  shop: "#9013FE",
};

export function getContrastBg(hex: string) {
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
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: { map: { include: { locations: true, paths: true } } },
  });
  if (!guild?.map) {
    console.log(`[map] No map found for guild ${guildId}`);
    return;
  }
  const map = await GameMap.getByGuildId(guildId);
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
  const png = await svgToPing(svg);
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

export { renderMapSvg, svgToPing as rasterizeSvgToPng };
