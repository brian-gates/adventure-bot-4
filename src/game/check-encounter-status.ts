import { bot } from "~/bot/index.ts";
import { prisma } from "~/db/index.ts";
import type { Encounter, Player } from "~/generated/prisma/client.ts";
import {
  formatRewardMessage,
  generateLoot,
} from "~/game/loot/loot-generation.ts";
import {
  createLootChoiceButtons,
  storePendingLootChoice,
} from "~/game/loot/loot-choice-handler.ts";

export async function checkEncounterStatus(
  encounter: Encounter,
  channelId: bigint,
) {
  const playersInEncounter: Player[] = await prisma.player.findMany({
    where: { encounterId: encounter.id },
  });
  const allPlayersDefeated = playersInEncounter.every(
    (p) => p.health <= 0,
  );

  if (allPlayersDefeated) {
    await prisma.encounter.update({
      where: { id: encounter.id },
      data: { status: "defeat" },
    });
    await bot.helpers.sendMessage(channelId, {
      content: "Your party has been defeated!",
    });
    return;
  }

  const enemiesInEncounter = await prisma.enemy.findMany({
    where: { encounterId: encounter.id },
  });
  const allEnemiesDefeated = enemiesInEncounter.every(
    (e) => e.health <= 0,
  );

  if (allEnemiesDefeated) {
    console.log("[checkEncounterStatus] Victory! Granting rewards...");

    await prisma.encounter.update({
      where: { id: encounter.id },
      data: { status: "victory" },
    });
    await bot.helpers.sendMessage(channelId, {
      content: "You are victorious!",
    });

    // Grant rewards to each player
    for (const player of playersInEncounter) {
      console.log(
        `[checkEncounterStatus] Processing rewards for player: ${player.name}`,
      );

      // Each player gets loot from a random enemy (for now, just pick the first)
      const enemy = enemiesInEncounter[0];
      const random = Math.random; // Replace with seeded random if needed
      const reward = generateLoot({
        enemy,
        playerLevel: player.level ?? 1,
        random,
      });

      console.log(`[checkEncounterStatus] Generated reward:`, {
        experience: reward.experience,
        gold: reward.gold,
        gearOptions: reward.gearOptions?.length || 0,
      });

      // Grant immediate rewards (experience and gold)
      await prisma.player.update({
        where: { id: player.id },
        data: {
          experience: (player.experience ?? 0) + reward.experience,
          gold: (player.gold ?? 0) + reward.gold,
        },
      });

      const message = formatRewardMessage({
        playerName: player.name,
        reward,
        levelUp: false, // We'll calculate this after gear choice
        newLevel: player.level ?? 1,
      });

      console.log(
        `[checkEncounterStatus] Sending reward message for ${player.name}`,
      );

      if (reward.gearOptions && reward.gearOptions.length > 0) {
        // Send message with buttons for gear choice
        const lootMessage = await bot.helpers.sendMessage(channelId, {
          content: message,
          components: [{
            type: 1, // Action row
            components: createLootChoiceButtons(reward.gearOptions),
          }],
        });

        // Store the pending choice for button interaction
        storePendingLootChoice({
          playerId: player.id,
          reward: {
            experience: reward.experience,
            gold: reward.gold,
            gearOptions: reward.gearOptions,
          },
          messageId: lootMessage.id.toString(),
          channelId,
        });
      } else {
        // No gear options, just send the message
        await bot.helpers.sendMessage(channelId, { content: message });
      }
    }
  }
}
