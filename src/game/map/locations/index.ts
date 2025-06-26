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
import { prisma } from "~/db/index.ts";
import { narrate } from "~/llm/index.ts";
import {
  cleanLocationName,
  generateLocationDescription,
  generateLocationName,
} from "~/prompts.ts";

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

export const getLocationDescription = async (
  location: Location,
): Promise<string> => {
  if (location.description && location.description.trim() !== "") {
    return location.description;
  }
  const description = await narrate({
    prompt: generateLocationDescription({
      name: location.name,
      type: location.type,
    }),
  });
  // Persist the generated description
  await prisma.location.update({
    where: { id: location.id },
    data: { description },
  });
  return description;
};

export const getLocationName = async (location: Location): Promise<string> => {
  if (location.name && location.name.trim() !== "") {
    return location.name;
  }
  const nameRaw = await narrate({
    prompt: generateLocationName(),
  });
  const name = cleanLocationName(nameRaw);
  await prisma.location.update({
    where: { id: location.id },
    data: { name },
  });
  return name;
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
