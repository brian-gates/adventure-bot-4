import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import type { Location } from "~/generated/prisma/client.ts";

export async function handleShop({
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
    content: `Shop at ${location.name} (stub).`,
  });
}
