import { bot } from "~/bot/index.ts";
import { prisma } from "~/db/index.ts";

export async function choosePath({
  channelId,
  guildId,
  title = "Where would you like to go?",
}: {
  channelId: bigint;
  guildId: bigint;
  title?: string;
}) {
  // Get the guild and its map to find available locations
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      map: {
        include: {
          locations: true,
        },
      },
    },
  });

  if (!guild?.map?.locations || guild.map.locations.length === 0) {
    await bot.helpers.sendMessage(channelId, {
      content: "No locations available. The adventure ends here... for now.",
    });
    return;
  }

  // Create location selection message
  const locationOptions = guild.map.locations
    .map((location, index) => `${index + 1}. ${location.name}`)
    .join("\n");

  const message = [
    `🎯 **${title}**`,
    "",
    locationOptions,
    "",
    "React with the number corresponding to your choice, or type the location name.",
  ].join("\n");

  await bot.helpers.sendMessage(channelId, {
    content: message,
  });
}
