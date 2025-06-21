import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getPlayer, setPlayerHealth } from "~/db/player.ts";
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

    const player = await getPlayer({
      id: healerId,
      name: healerName,
      guildId,
    });

    if (!interaction.channelId || !interaction.guildId) {
      throw new Error("Missing channel or guild ID.");
    }

    const { roll: healAmount } = await rollAndAnnounceDie({
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      sides: 4,
      label: "heal",
      random,
    });

    const newHealth = Math.min(player.maxHealth, player.health + healAmount);
    await setPlayerHealth({
      id: healerId,
      health: newHealth,
      channelId: interaction.channelId,
      healAmount,
    });

    const prompt = narrateHeal({
      healerId,
      targetId: healerId,
      healAmount,
      newHealth,
      maxHealth: player.maxHealth,
    });
    const narration = await narrate({ prompt });
    await bot.helpers.sendMessage(interaction.channelId, {
      content: narration,
    });

    // Health bar is now automatically displayed by setPlayerHealth
    return;
  }

  const player = await getPlayer({
    id: targetPlayer.id,
    name: targetPlayer.name,
    guildId,
  });

  if (!interaction.channelId || !interaction.guildId) {
    throw new Error("Missing channel or guild ID.");
  }

  const { roll: healAmount } = await rollAndAnnounceDie({
    channelId: interaction.channelId,
    guildId: interaction.guildId,
    sides: 4,
    label: "heal",
    random,
  });

  const newHealth = Math.min(player.maxHealth, player.health + healAmount);
  await setPlayerHealth({
    id: targetPlayer.id,
    health: newHealth,
    channelId: interaction.channelId,
    healAmount,
  });

  const prompt = narrateHeal({
    healerId: interaction.user.id,
    targetId: targetPlayer.id,
    healAmount,
    newHealth,
    maxHealth: player.maxHealth,
  });
  const narration = await narrate({ prompt });
  await bot.helpers.sendMessage(interaction.channelId, { content: narration });

  // Health bar is now automatically displayed by setPlayerHealth
}
