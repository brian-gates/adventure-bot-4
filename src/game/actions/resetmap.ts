import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { seedMapForGuild } from "../map/seed-map.ts";

export async function resetmap({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  const guildId = interaction.guildId?.toString();
  if (!guildId) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "This command can only be used in a server.",
    });
    return;
  }
  try {
    const map = await prisma.map.findFirst({ where: { channelId: guildId } });
    if (map) {
      await prisma.map.deleteMany({ where: { channelId: guildId } });
      // Wait for cascading deletes to complete
      let tries = 0;
      while (tries < 10) {
        console.log(`[resetmap] Waiting for cascading deletes to complete...`);
        const locs = await prisma.location.findMany({
          where: { mapId: map.id },
        });
        if (locs.length === 0) break;
        await new Promise((r) => setTimeout(r, 50));
        tries++;
      }
    }
    await seedMapForGuild({ guildId });
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "Map has been cleared and regenerated.",
    });
  } catch (err) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `Error resetting map: ${err}`,
    });
  }
}
