import {
  type Bot,
  type Interaction,
  InteractionResponseTypes,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { actions } from "~/game/actions/index.ts";
import { findOrCreateGuild } from "~/db/find-or-create-guild.ts";
import { seededRandom } from "~/game/seeded-random.ts";

export async function handleCommand(bot: Bot, interaction: Interaction) {
  if (
    interaction.type !== 2 ||
    !interaction.data?.name ||
    !(Object.keys(actions) as (keyof typeof actions)[]).includes(
      interaction.data.name as keyof typeof actions,
    )
  ) {
    return;
  }

  const isEphemeral = interaction.data.name === "inspect";
  await bot.helpers.sendInteractionResponse(
    interaction.id,
    interaction.token,
    {
      type: InteractionResponseTypes.DeferredChannelMessageWithSource,
      data: {
        flags: isEphemeral ? (1 << 6) : undefined, // EPHEMERAL
      },
    },
  );

  if (!interaction.guildId) {
    return;
  }

  const guild = await findOrCreateGuild({ id: interaction.guildId });
  await actions[interaction.data.name as keyof typeof actions]({
    bot,
    interaction,
    random: seededRandom(guild.seed, guild.randomCursor),
  });
}
