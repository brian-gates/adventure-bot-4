import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getOrCreatePlayer, updatePlayerHealth } from "~/db/player.ts";
import {
  getTargetPlayer,
  getUsernameFromInteraction,
} from "~/discord/get-target.ts";
import { composeDiceAndHealthbarImage } from "~/game/dice.ts";
import { narrate } from "~/llm/index.ts";
import { narrateAttack } from "~/prompts.ts";
import { bot } from "~/bot/index.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";

function getUserAvatarUrl(
  { id, avatar }: {
    id: string;
    avatar?: string | null;
    discriminator: string | null;
  },
) {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
  }
  // Discord's default avatar logic: user id modulo 5
  const defaultAvatarNumber = Number(BigInt(id) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
}

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

  // Roll d20
  const d20 = Math.floor(random() * 20) + 1;
  const hit = d20 >= 10;

  // Damage logic
  const player = await getOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.name,
    guildId,
  });

  const { d4, actualDamage, newHealth, diceImagePaths } = hit
    ? (() => {
      const damageRoll = Math.floor(random() * 4) + 1;
      const damage = player ? Math.min(damageRoll, player.health) : 0;
      const updatedHealth = player
        ? Math.max(0, player.health - damage)
        : undefined;
      const imagePaths = [
        `media/dice/output/d20_${d20}.png`,
        `media/dice/output/d4_${damageRoll}.png`,
      ];

      return {
        d4: damageRoll,
        actualDamage: damage,
        newHealth: updatedHealth,
        diceImagePaths: imagePaths,
      };
    })()
    : {
      d4: 0,
      actualDamage: 0,
      newHealth: player?.health,
      diceImagePaths: [`media/dice/output/d20_${d20}.png`],
    };

  if (player && newHealth !== undefined) {
    await updatePlayerHealth({
      id: targetPlayer.id,
      health: newHealth,
    });
    const attackerName = getUsernameFromInteraction({
      interaction,
      userId: authorId,
    });
    await getOrCreatePlayer({
      id: authorId,
      name: attackerName,
      guildId,
    });
  }

  // Health bar image
  const healthBarImage = await getHealthBarImage({
    current: newHealth ?? 0,
    max: player?.maxHealth ?? 1,
    damage: actualDamage,
    label: player?.name,
  });

  // Compose dice and health bar image
  const composedImage = await composeDiceAndHealthbarImage({
    imagePaths: diceImagePaths,
    healthBarImage,
  });
  const fileName = `attack_${d20}${hit ? `_${d4}` : ""}.png`;

  // Narration
  const attackerName = getUsernameFromInteraction({
    interaction,
    userId: authorId,
  });
  const prompt = narrateAttack({
    attacker: attackerName,
    target: targetPlayer.name,
    hit,
    damage: actualDamage,
    d20,
    attackerId: authorId,
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

  // Prepare discriminator as string or null
  let discriminatorString: string | null = null;
  if (
    typeof interaction.user.discriminator === "string" ||
    typeof interaction.user.discriminator === "number" ||
    typeof interaction.user.discriminator === "bigint"
  ) {
    discriminatorString = String(interaction.user.discriminator);
  }
  const avatarUrl = getUserAvatarUrl({
    id: String(interaction.user.id),
    avatar: interaction.user.avatar
      ? String(interaction.user.avatar)
      : undefined,
    discriminator: discriminatorString,
  });

  // Send embed with narration and composed image
  await bot.helpers.sendMessage(channelId, {
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
