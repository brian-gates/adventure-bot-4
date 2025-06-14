import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { prisma } from "~/db/index.ts";
import { findOrCreatePlayer, setPlayerHealth } from "~/db/player.ts";
import { getTargetPlayer } from "~/discord/get-target.ts";
import { rollAndAnnounceDie } from "~/game/dice.ts";
import { seededRandom } from "~/game/seeded-random.ts";
import { stringToSeed } from "~/game/string-to-seed.ts";
import { narrate } from "~/llm/index.ts";
import { narrateAttack } from "~/prompts.ts";
import { healthBar } from "~/ui/health-bar.ts";

export async function attack({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  const authorId = interaction.user.id;
  const channelId = interaction.channelId!;
  const targetPlayer = await getTargetPlayer({ interaction });
  if (!targetPlayer) throw new Error("Target player not found");
  const { seed } = (await prisma.guild.findUnique({
    where: { id: BigInt(interaction.guildId ?? "0") },
  })) ??
    (() => {
      throw new Error("Guild not found");
    })();
  const { roll: d20 } = await rollAndAnnounceDie({
    bot,
    interaction,
    sides: 20,
    label: "d20",
    random: seededRandom(stringToSeed(seed)),
  });
  const { roll: damage } = await rollAndAnnounceDie({
    bot,
    interaction,
    sides: 4,
    label: "1d4 (unarmed)",
    random: seededRandom(stringToSeed(seed)),
  });
  const player = await findOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.name,
  });
  const actualDamage = player ? Math.min(damage, player.health) : 0;
  const newHealth = player
    ? Math.max(0, player.health - actualDamage)
    : undefined;
  if (player && newHealth !== undefined) {
    await setPlayerHealth({ id: targetPlayer.id, health: newHealth });
    await findOrCreatePlayer({
      id: authorId.toString(),
      name: "Unknown",
    });
  }
  const prompt = narrateAttack({
    authorId: authorId.toString(),
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

  if (player && newHealth !== undefined) {
    await bot.helpers.sendMessage(channelId, {
      content: `<@${targetPlayer.id}>'s health:`,
      file: {
        blob: new Blob([
          await healthBar({
            current: newHealth,
            max: player.maxHealth,
            damage: actualDamage,
            width: 200,
            height: 24,
          }),
        ]),
        name: "healthbar.png",
      },
    });
  }
}
