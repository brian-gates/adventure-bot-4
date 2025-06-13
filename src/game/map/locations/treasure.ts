import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import type { Location } from "~/generated/prisma/client.ts";

export async function handleTreasure({
  bot,
  interaction,
  location,
}: {
  bot: Bot;
  interaction: Interaction;
  location: Location;
}) {
  if (!interaction.channelId) {
    return;
  }
  await bot.helpers.sendMessage(interaction.channelId, {
    content: `Treasure at ${location.name} (stub).`,
  });
}
