import type { LocationType } from "~/generated/prisma/client.ts";
import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import type { Location } from "~/generated/prisma/client.ts";
import { handleBoss } from "./boss.ts";
import { handleCampfire } from "./campfire.ts";
import { handleCombat } from "./combat.ts";
import { handleElite } from "./elite.ts";
import { handleEvent } from "./event.ts";
import { handleShop } from "./shop.ts";
import { handleTreasure } from "./treasure.ts";

type LocationHandler = (params: {
  bot: Bot;
  interaction: Interaction;
  location: Location;
  random: () => number;
}) => Promise<void>;

export const locationHandlers: Record<LocationType, LocationHandler> = {
  combat: handleCombat,
  event: handleEvent,
  shop: handleShop,
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
  handleTreasure,
};
