import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getOrCreatePlayer, setPlayerHealth } from "~/db/player.ts";
import { getTargetPlayer } from "~/discord/get-target.ts";
import { rollAndAnnounceDie } from "~/game/dice.ts";
import { narrate } from "~/llm/index.ts";
import { narrateAttack } from "~/prompts.ts";
import { bot } from "~/bot/index.ts";

export async function attack({
  interaction,
  random,
}: {
  interaction: Interaction;
  random: () => number;
}) {
  const authorId = interaction.user.id;
  const channelId = interaction.channelId!;
  const guildId = interaction.guildId!;
  const targetPlayer = await getTargetPlayer({ interaction, guildId });
  if (!targetPlayer) throw new Error("Target player not found");
  const { roll: d20 } = await rollAndAnnounceDie({
    channelId,
    sides: 20,
    label: "d20",
    guildId,
    random,
  });
  const { roll: damage } = await rollAndAnnounceDie({
    channelId,
    guildId,
    sides: 4,
    label: "1d4 (unarmed)",
    random,
  });
  const player = await getOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.name,
    guildId,
  });
  const actualDamage = player ? Math.min(damage, player.health) : 0;
  const newHealth = player
    ? Math.max(0, player.health - actualDamage)
    : undefined;
  if (player && newHealth !== undefined) {
    await setPlayerHealth({
      id: targetPlayer.id,
      health: newHealth,
      channelId: channelId,
      damageAmount: actualDamage,
    });
    await getOrCreatePlayer({
      id: authorId,
      name: "Unknown",
      guildId,
    });
  }
  const prompt = narrateAttack({
    attackerId: authorId,
    target: targetPlayer.name,
    d20,
    damage,
    newHealth,
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
  await bot.helpers.sendMessage(channelId, { content: narration });

  // Health bar is now automatically displayed by setPlayerHealth
}
