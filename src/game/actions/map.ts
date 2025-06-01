import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { PrismaClient } from "~/generated/prisma/client.ts";

const prisma = new PrismaClient();

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

const renderMapPng = async ({
  locations,
  paths,
}: {
  locations: any[];
  paths: any[];
}) => {
  console.log(`[map] Rendering map PNG (placeholder)`);
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return png;
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
  let image;
  try {
    image = await renderMapPng({ locations, paths });
  } catch (err) {
    console.error(`[map] Error in renderMapPng:`, err);
    try {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: `Error rendering map image: ${err}`,
      });
    } catch (e) {
      console.error(`[map] Error sending error response:`, e);
    }
    return;
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
      await bot.helpers.sendMessage(interaction.channelId, {
        file: [
          { blob: new Blob([image], { type: "image/png" }), name: "map.png" },
        ],
      });
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
