import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getOrCreatePlayer, updatePlayerHealth } from "~/db/player.ts";

export const setHealth = async ({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) => {
  if (!interaction.guildId || !interaction.channelId) return;

  // Extract subcommand options for /set health
  const subcommandOptions = interaction.data?.options?.[0]?.options;
  const targetOption = subcommandOptions?.find((o) => o.name === "target");
  const userId = targetOption
    ? BigInt(String(targetOption.value))
    : interaction.user.id;
  const health = Number(
    subcommandOptions?.find((o) => o.name === "health")?.value,
  );
  if (isNaN(health) || health < 0) {
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "Invalid health value.",
    });
    return;
  }

  const username = await (async () => {
    if (targetOption && typeof targetOption.value === "string") {
      try {
        const user = await bot.helpers.getUser(BigInt(targetOption.value));
        return user?.username ?? interaction.user.username;
      } catch {
        return interaction.user.username;
      }
    }
    return interaction.user.username;
  })();

  await getOrCreatePlayer({
    id: userId,
    name: username,
    guildId: interaction.guildId,
  });
  await updatePlayerHealth({ id: userId, health });

  await bot.helpers.sendMessage(interaction.channelId, {
    embeds: [
      {
        title: "Health Set",
        description: `Set health for <@${userId}> to **${health}**.`,
        fields: [
          { name: "Player", value: `<@${userId}>`, inline: true },
          { name: "Health", value: `${health}`, inline: true },
        ],
      },
    ],
  });
};
