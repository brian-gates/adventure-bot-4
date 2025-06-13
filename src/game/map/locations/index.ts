import type { LocationType } from "~/generated/prisma/client.ts";
import { handleBoss } from "./boss.ts";
import { handleCampfire } from "./campfire.ts";
import { handleCombat } from "./combat.ts";
import { handleElite } from "./elite.ts";
import { handleEvent } from "./event.ts";
import { handleShop } from "./shop.ts";
import { handleTavern } from "./tavern.ts";
import { handleTreasure } from "./treasure.ts";

const fallback = async ({ bot, interaction, location }: any) => {
  await bot.helpers.sendMessage(interaction.channelId, {
    content: `Nothing special at ${location.name} (stub).`,
  });
};

export const locationHandlers: Record<LocationType, Function> = {
  combat: handleCombat,
  event: handleEvent,
  shop: handleShop,
  tavern: handleTavern,
  elite: handleElite,
  treasure: handleTreasure,
  boss: handleBoss,
  campfire: handleCampfire,
  // Add more as needed
};

export {
  handleBoss,
  handleCampfire,
  handleCombat,
  handleElite,
  handleEvent,
  handleShop,
  handleTavern,
  handleTreasure,
};
