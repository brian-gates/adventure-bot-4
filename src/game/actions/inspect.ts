import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getOrCreatePlayer } from "~/db/player.ts";
import { getTargetPlayer } from "~/discord/get-target.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";

export async function inspect({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  if (!interaction.guildId || !interaction.channelId) {
    throw new Error("Missing guild or channel ID.");
  }

  const target = await getTargetPlayer({
    interaction,
    guildId: interaction.guildId,
  });

  const player = await getOrCreatePlayer({
    id: target?.id ?? interaction.user.id,
    name: target?.name ?? interaction.user.username,
    guildId: interaction.guildId,
  });

  const healthBarImage = await getHealthBarImage({
    current: player.health,
    max: player.maxHealth,
    label: player.name,
  });

  const fileName = `${player.name}-health-bar.png`;

  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    embeds: [
      {
        title: `Stats for ${player.name}`,
        fields: [
          {
            name: "HP",
            value: `${player.health}/${player.maxHealth}`,
            inline: true,
          },
        ],
        image: {
          url: `attachment://${fileName}`,
        },
      },
    ],
    file: {
      blob: new Blob([healthBarImage]),
      name: fileName,
    },
  });
}
