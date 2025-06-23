import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { handleBoss } from "~/game/map/locations/boss.ts";
import { handleCampfire } from "~/game/map/locations/campfire.ts";
import { handleCombat } from "~/game/map/locations/combat.ts";
import { handleElite } from "~/game/map/locations/elite.ts";
import { handleEvent } from "~/game/map/locations/event.ts";
import { handleShop } from "~/game/map/locations/shop.ts";
import { handleTreasure } from "~/game/map/locations/treasure.ts";
import { LocationType } from "~/generated/prisma/client.ts";

const locationHandlers = {
  [LocationType.combat]: handleCombat,
  [LocationType.event]: handleEvent,
  [LocationType.elite]: handleElite,
  [LocationType.treasure]: handleTreasure,
  [LocationType.boss]: handleBoss,
  [LocationType.campfire]: handleCampfire,
  [LocationType.shop]: handleShop,
};

export async function adventure({
  bot,
  interaction,
  random,
}: {
  bot: Bot;
  interaction: Interaction;
  random: () => number;
}) {
  if (!interaction.channelId) return;

  const guildId = interaction.guildId!;
  const guild = await prisma.guild.findUnique({
    where: {
      id: guildId,
    },
    include: {
      currentLocation: true,
    },
  });

  const currentLocation = guild?.currentLocation;

  if (!currentLocation) {
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "You are not in a location.",
    });
    return;
  }

  const handler = locationHandlers[currentLocation.type];
  if (handler) {
    await handler({ bot, interaction, location: currentLocation, random });
    return;
  }

  // Default/fallback if no handler
  await bot.helpers.sendMessage(interaction.channelId, {
    content: `You arrive at ${currentLocation.name}, but nothing happens...`,
  });
}
