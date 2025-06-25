import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { handleAutocomplete } from "./autocomplete.ts";
import { handleButton } from "./button.ts";
import { handleCommand } from "./command.ts";
import { handleSelectMenu } from "./select-menu.ts";

export async function handleInteraction(bot: Bot, interaction: Interaction) {
  console.log("[Interaction] Received interaction:", {
    type: interaction.type,
    customId: interaction.data?.customId,
    name: interaction.data?.name,
  });

  await handleAutocomplete(bot, interaction);
  await handleSelectMenu(bot, interaction);
  await handleButton(bot, interaction);
  await handleCommand(bot, interaction);
}
