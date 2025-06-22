import {
  type Bot,
  type Interaction,
  InteractionResponseTypes,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { handleLootChoice } from "~/game/loot/loot-choice-handler.ts";

export async function handleButton(bot: Bot, interaction: Interaction) {
  if (
    interaction.type !== 3 ||
    !interaction.data?.customId?.startsWith("loot_choice_")
  ) {
    return;
  }
  const choiceIndex = parseInt(interaction.data.customId.split("_")[2]);
  const playerId = BigInt(interaction.user.id);
  const messageId = interaction.message?.id.toString() || "";

  console.log("[Button Interaction] Loot choice clicked:", {
    playerId: playerId.toString(),
    choiceIndex,
    messageId,
    customId: interaction.data.customId,
  });

  const result = await handleLootChoice({
    playerId,
    choiceIndex,
    messageId,
    token: interaction.token,
  });

  if (!result.success) {
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: result.message,
          flags: 64, // Ephemeral
        },
      },
    );
  }
}
