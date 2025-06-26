import {
  type Bot,
  type Interaction,
  InteractionResponseTypes,
  InteractionTypes,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { actions, isActionName } from "~/game/actions/index.ts";
import { findOrCreateGuild } from "~/db/find-or-create-guild.ts";
import { guildRandom } from "~/game/guild-random.ts";

export async function handleCommand(bot: Bot, interaction: Interaction) {
  if (
    interaction.type !== InteractionTypes.ApplicationCommand ||
    !interaction.data?.name ||
    !interaction.guildId
  ) {
    return;
  }

  // Always defer the response first
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

  // Handle 'set' command with subcommands
  if (interaction.data.name === "set") {
    const subcommand = interaction.data.options?.[0]?.name;
    if (subcommand === "health" || subcommand === "seed") {
      await actions.set[subcommand]({ bot, interaction });
    }
    return;
  }

  if (!isActionName(interaction.data.name)) {
    return;
  }

  const { id: guildId, seed, randomCursor } = await findOrCreateGuild({
    id: interaction.guildId,
  });

  const action = actions[interaction.data.name];
  if (typeof action === "function") {
    await action({
      bot,
      interaction,
      random: guildRandom({
        guildId,
        seed,
        cursor: randomCursor,
      }),
    });
  }
}
