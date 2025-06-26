import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getOrCreatePlayer, updatePlayerHealth } from "~/db/player.ts";
import {
  getTargetPlayer,
  getUsernameFromInteraction,
} from "~/discord/get-target.ts";
import { composeDiceAndHealthbarImage } from "~/game/dice.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";
import { narrate } from "~/llm/index.ts";
import { narrateHeal } from "~/prompts.ts";
import { prisma } from "~/db/index.ts";
import type { Player } from "~/generated/prisma/client.ts";

async function healAndFetchPlayer(
  { id, healAmount }: { id: bigint; healAmount: number },
): Promise<Player> {
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) throw new Error("Player not found");
  const newHealth = Math.min(player.maxHealth, player.health + healAmount);
  const updatedPlayer = await updatePlayerHealth({ id, health: newHealth });
  return updatedPlayer as Player;
}

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
  if (!interaction.channelId || !interaction.guildId) {
    throw new Error("Missing channel or guild ID.");
  }
  let player: Player;
  let healerId: bigint;
  let targetId: bigint;
  let name: string;
  if (!targetPlayer) {
    healerId = interaction.user.id;
    name = getUsernameFromInteraction({ interaction, userId: healerId });
    player = await getOrCreatePlayer({ id: healerId, name, guildId }) as Player;
    targetId = healerId;
  } else {
    healerId = interaction.user.id;
    targetId = targetPlayer.id;
    name = targetPlayer.name;
    player = await getOrCreatePlayer({ id: targetId, name, guildId }) as Player;
  }
  const healAmount = Math.floor(random() * 4) + 1;
  const diceImagePaths = [`media/dice/output/d4_${healAmount}.png`];
  const updatedPlayer = await healAndFetchPlayer({ id: player.id, healAmount });
  const effectiveHeal = updatedPlayer.health - player.health;
  const healthBarImage = await getHealthBarImage({
    current: player.health,
    max: updatedPlayer.maxHealth,
    heal: effectiveHeal,
    label: updatedPlayer.name,
  });
  const composedImage = await composeDiceAndHealthbarImage({
    imagePaths: diceImagePaths,
    healthBarImage,
  });
  const fileName = `heal_${healAmount}.png`;
  const prompt = narrateHeal({
    healerId,
    targetId,
    healAmount,
    maxHealth: updatedPlayer.maxHealth,
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
  const avatarUrl = interaction.user.avatar
    ? `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${
      Number(interaction.user.discriminator) % 5
    }.png`;
  await bot.helpers.sendMessage(interaction.channelId, {
    embeds: [
      {
        description: narration,
        image: { url: `attachment://${fileName}` },
        thumbnail: { url: avatarUrl },
      },
    ],
    file: {
      blob: new Blob([composedImage]),
      name: fileName,
    },
  });
}
