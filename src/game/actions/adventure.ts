import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { narrate } from "~/llm/index.ts";

export async function adventure({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  if (!interaction.channelId || !interaction.guildId) return;
  const guildId = interaction.guildId;
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild?.locationId) {
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "No current location set for this guild.",
    });
    return;
  }
  const location = await prisma.location.findUnique({
    where: { id: guild.locationId },
  });
  if (!location) {
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "Current location not found.",
    });
    return;
  }
  const paths = await prisma.path.findMany({
    where: { fromLocationId: location.id },
  });
  if (paths.length === 0) {
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "You have reached the end of the adventure!",
    });
    return;
  }
  const nextLocationIds = paths.map((p) => p.toLocationId);
  const nextLocations = await prisma.location.findMany({
    where: { id: { in: nextLocationIds } },
  });
  const options = nextLocations
    .map((loc) => `- ${loc.name} (${loc.type})`)
    .join("\n");
  const narration = await narrate({
    prompt: `Narrate a short, vivid fantasy adventure for <@${
      interaction.user?.id ?? interaction.member?.user?.id
    }> in a Discord RPG. Respond with a single immersive sentence.`,
  });
  await bot.helpers.sendMessage(interaction.channelId, {
    content: `${narration}\n\n**Paths ahead:**\n${options}`,
  });
}
