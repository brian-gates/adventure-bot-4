import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { findOrCreatePlayer, setPlayerHealth } from "~/db/player.ts";
import { getTargetPlayer } from "~/discord/get-target.ts";
import { rollDie } from "~/game/dice.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { narrate } from "~/llm/index.ts";
import { narrateHeal } from "~/prompts.ts";
import { healthBar } from "~/ui/health-bar.ts";

export async function heal({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  const targetPlayer = await getTargetPlayer({ interaction });
  if (!targetPlayer) {
    await bot.helpers.sendMessage(interaction.channelId!, {
      content: `<@${
        interaction.user?.id ?? interaction.member?.user?.id
      }>, whom would you like to heal?`,
    });
    return;
  }
  const player = await findOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.name,
  });
  const healAmount = await rollDie({ sides: 4, random: seededRandom(0) });
  const newHealth = Math.min(player.maxHealth, player.health + healAmount);
  await setPlayerHealth({ id: targetPlayer.id, health: newHealth });

  const prompt = narrateHeal({
    authorId: interaction.user?.id?.toString() ??
      interaction.member?.user?.id?.toString() ??
      "",
    targetId: targetPlayer.id,
    healAmount,
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
  await bot.helpers.sendMessage(interaction.channelId!, {
    content: narration,
  });

  await bot.helpers.sendMessage(interaction.channelId!, {
    content: `<@${targetPlayer.id}>'s health bar:`,
    file: {
      blob: new Blob([
        await healthBar({
          current: newHealth,
          max: player.maxHealth,
          heal: healAmount,
          width: 200,
          height: 24,
        }),
      ]),
      name: "healthbar.png",
    },
  });
}
