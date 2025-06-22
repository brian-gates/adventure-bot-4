import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { seedMapForGuild } from "../map/seed-map-for-guild.ts";

export async function resetmap({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "This command can only be used in a server.",
    });
    return;
  }
  try {
    // Delete the map - cascade deletes will handle all related records
    await prisma.map.deleteMany({
      where: { guild: { is: { id: guildId } } },
    });

    await seedMapForGuild({ id: guildId });
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "Map has been cleared and regenerated.",
    });
  } catch (err) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `Error resetting map: ${err}`,
    });
  }
}
