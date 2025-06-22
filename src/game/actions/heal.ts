import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getOrCreatePlayer, setPlayerHealth } from "~/db/player.ts";
import { getTargetPlayer } from "~/discord/get-target.ts";
import { rollAndAnnounceDie } from "~/game/dice.ts";
import { narrate } from "~/llm/index.ts";
import { narrateHeal } from "~/prompts.ts";

export async function heal({
  bot,
  interaction,
  random,
}: {
  bot: Bot;
  interaction: Interaction;
  random: () => number;
}) {
  const guildId = interaction.guildId!;
  const targetPlayer = await getTargetPlayer({ interaction, guildId });
  if (!targetPlayer) {
    // If no target specified, heal the user who ran the command
    const healerId = interaction.user.id;
    const healerName = interaction.user.username ?? healerId.toString();

    const player = await getOrCreatePlayer({
      id: healerId,
      name: healerName,
      guildId,
    });

    if (!interaction.channelId || !interaction.guildId) {
      throw new Error("Missing channel or guild ID.");
    }

    const oldHealth = player.health;
    const { roll: healAmount } = await rollAndAnnounceDie({
      channelId: interaction.channelId,
      sides: 4,
      label: "heal",
      random,
    });

    const newHealth = Math.min(player.maxHealth, oldHealth + healAmount);
    const effectiveHeal = newHealth - oldHealth;
    await setPlayerHealth({
      id: healerId,
      health: newHealth,
      channelId: interaction.channelId,
      healAmount: effectiveHeal,
    });

    const prompt = narrateHeal({
      healerId,
      targetId: healerId,
      healAmount,
      maxHealth: player.maxHealth,
    });
    const narrationResult = await narrate({ prompt });
    const LLMResponse = z.object({ response: z.string() });
    const narration = (() => {
      if (typeof narrationResult === "string") {
        try {
          return LLMResponse.parse(JSON.parse(narrationResult)).response;
        } catch {
          return narrationResult;
        }
      }
      if (
        narrationResult &&
        typeof narrationResult === "object" &&
        "response" in narrationResult
      ) {
        return (narrationResult as { response: string }).response;
      }
      return JSON.stringify(narrationResult);
    })();
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: narration,
    });

    // Health bar is now automatically displayed by setPlayerHealth
    return;
  }

  const player = await getOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.name,
    guildId,
  });

  if (!interaction.channelId || !interaction.guildId) {
    throw new Error("Missing channel or guild ID.");
  }

  const oldHealth = player.health;
  const { roll: healAmount } = await rollAndAnnounceDie({
    channelId: interaction.channelId,
    sides: 4,
    label: "heal",
    random,
  });

  const newHealth = Math.min(player.maxHealth, oldHealth + healAmount);
  const effectiveHeal = newHealth - oldHealth;
  await setPlayerHealth({
    id: targetPlayer.id,
    health: newHealth,
    channelId: interaction.channelId,
    healAmount: effectiveHeal,
  });

  const prompt = narrateHeal({
    healerId: interaction.user.id,
    targetId: targetPlayer.id,
    healAmount,
    maxHealth: player.maxHealth,
  });
  const narrationResult = await narrate({ prompt });
  const LLMResponse = z.object({ response: z.string() });
  const narration = (() => {
    if (typeof narrationResult === "string") {
      try {
        return LLMResponse.parse(JSON.parse(narrationResult)).response;
      } catch {
        return narrationResult;
      }
    }
    if (
      narrationResult &&
      typeof narrationResult === "object" &&
      "response" in narrationResult
    ) {
      return (narrationResult as { response: string }).response;
    }
    return JSON.stringify(narrationResult);
  })();
  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    content: narration,
  });
}
