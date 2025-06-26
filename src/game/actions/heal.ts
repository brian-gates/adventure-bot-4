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

async function healAndFetchPlayer(
  { id, healAmount }: {
    id: bigint;
    healAmount: number;
  },
) {
  // Fetch, update, and return the updated player atomically
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) throw new Error("Player not found");
  const newHealth = Math.min(player.maxHealth, player.health + healAmount);
  const updatedPlayer = await updatePlayerHealth({ id, health: newHealth });
  return updatedPlayer;
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
  if (!targetPlayer) {
    // If no target specified, heal the user who ran the command
    const healerId = interaction.user.id;
    const healerName = getUsernameFromInteraction({
      interaction,
      userId: healerId,
    });

    const player = await getOrCreatePlayer({
      id: healerId,
      name: healerName,
      guildId,
    });

    if (!interaction.channelId || !interaction.guildId) {
      throw new Error("Missing channel or guild ID.");
    }

    const healAmount = Math.floor(random() * 4) + 1;
    const diceImagePaths = [`media/dice/output/d4_${healAmount}.png`];

    // Atomically update and fetch the player
    const updatedPlayer = await healAndFetchPlayer({
      id: healerId,
      healAmount,
    });
    const effectiveHeal = updatedPlayer.health - player.health;

    // Generate health bar image
    const healthBarImage = await getHealthBarImage({
      current: updatedPlayer.health,
      max: updatedPlayer.maxHealth,
      heal: effectiveHeal,
      label: updatedPlayer.name,
    });

    // Compose dice and health bar image
    const composedImage = await composeDiceAndHealthbarImage({
      imagePaths: diceImagePaths,
      healthBarImage,
    });
    const fileName = `heal_${healAmount}.png`;

    const prompt = narrateHeal({
      healerId,
      targetId: healerId,
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

    // Get user's avatar URL
    const avatarUrl = interaction.user.avatar
      ? `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${
        Number(interaction.user.discriminator) % 5
      }.png`;

    // Send embed with narration and composed image
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

  const healAmount = Math.floor(random() * 4) + 1;
  const diceImagePaths = [`media/dice/output/d4_${healAmount}.png`];

  // Atomically update and fetch the player
  const updatedPlayer = await healAndFetchPlayer({
    id: targetPlayer.id,
    healAmount,
  });
  const effectiveHeal = updatedPlayer.health - player.health;

  // Generate health bar image
  const healthBarImage = await getHealthBarImage({
    current: updatedPlayer.health,
    max: updatedPlayer.maxHealth,
    heal: effectiveHeal,
    label: updatedPlayer.name,
  });

  // Compose dice and health bar image
  const composedImage = await composeDiceAndHealthbarImage({
    imagePaths: diceImagePaths,
    healthBarImage,
  });
  const fileName = `heal_${healAmount}.png`;

  const prompt = narrateHeal({
    healerId: interaction.user.id,
    targetId: targetPlayer.id,
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

  // Get user's avatar URL
  const avatarUrl = interaction.user.avatar
    ? `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${
      Number(interaction.user.discriminator) % 5
    }.png`;

  // Send embed with narration and composed image
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
