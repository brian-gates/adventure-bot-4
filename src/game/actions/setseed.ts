import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { seedMapForGuild } from "../map/seed-map-for-guild.ts";

export const setseed = async ({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) => {
  const guildId = interaction.guildId;
  if (!guildId) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "This command can only be used in a server.",
    });
    return;
  }
  const seed = interaction.data?.options?.find((o) => o.name === "seed")?.value;
  if (!seed || typeof seed !== "string") {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "You must provide a seed value.",
    });
    return;
  }
  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { seed, randomCursor: 0 },
      create: { id: guildId, seed },
    });

    // Delete the map - cascade deletes will handle all related records
    await prisma.map.deleteMany({ where: { guild: { is: { id: guildId } } } });

    await seedMapForGuild({ id: guildId });
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `Seed set to \`${seed}\`\nMap has been regenerated.`,
    });
  } catch (err) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `Error setting seed: ${err}`,
    });
  }
};
