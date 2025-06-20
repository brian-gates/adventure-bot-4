import { prisma } from "~/db/index.ts";
import type { Encounter, Player } from "~/generated/prisma/client.ts";
import { checkEncounterStatus } from "../check-encounter-status.ts";
import { rollAndAnnounceDie } from "../dice.ts";
import { narrate } from "~/llm/index.ts";
import { narrateCombatAction } from "~/prompts.ts";

export type PlayerTemplate = {
  create: (ctx: {
    random: () => number;
    channelId: bigint;
    guildId: bigint;
  }) => {
    name: string;
    maxHealth: number;
    health: number;
    abilities: string[];
    act: (encounter: Encounter) => Promise<void>;
  };
};

export const basicPlayerTemplate: PlayerTemplate = {
  create: ({ random, channelId, guildId }) => ({
    name: "Basic Player",
    maxHealth: 10,
    health: 10,
    abilities: ["attack"],
    act: async (encounter) => {
      // Get the player instance for this encounter
      const encounterPlayer = await prisma.encounterPlayer.findFirst({
        where: { encounterId: encounter.id },
        include: { player: true },
      });

      if (encounterPlayer) {
        await attackWeakestEnemy({
          random,
          channelId,
          guildId,
          encounter,
          attacker: encounterPlayer.player,
        });
      }
    },
  }),
};

async function attackWeakestEnemy({
  random,
  channelId,
  guildId,
  encounter,
  attacker,
}: {
  random: () => number;
  channelId: bigint;
  guildId: bigint;
  encounter: Encounter;
  attacker: Player;
}) {
  const weakestEnemy = await prisma.encounterEnemy.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      enemy: {
        health: "asc",
      },
    },
    include: {
      enemy: true,
    },
  });

  if (!weakestEnemy) {
    return;
  }

  const { roll: attack } = await rollAndAnnounceDie({
    channelId,
    guildId,
    sides: 20,
    label: "attack",
    random,
  });

  const hit = attack > 10; // Simple AC 10 for now

  if (!hit) {
    // Narrate the miss
    const missPrompt = narrateCombatAction({
      attacker: attacker.name,
      target: weakestEnemy.enemy.name,
      hit: false,
    });
    const missNarration = await narrate({ prompt: missPrompt });
    const { bot } = await import("~/bot/index.ts");
    await bot.helpers.sendMessage(channelId, { content: missNarration });
    return;
  }

  const { roll: damage } = await rollAndAnnounceDie({
    channelId,
    guildId,
    sides: 4,
    label: "1d4 (unarmed)",
    random,
  });

  const newHealth = Math.max(0, weakestEnemy.enemy.health - damage);

  // Update enemy health
  await prisma.enemy.update({
    where: { id: weakestEnemy.enemy.id },
    data: { health: newHealth },
  });

  // Narrate the hit
  const hitPrompt = narrateCombatAction({
    attacker: attacker.name,
    target: weakestEnemy.enemy.name,
    hit: true,
    damage,
    newHealth,
    maxHealth: weakestEnemy.enemy.maxHealth,
  });
  const hitNarration = await narrate({ prompt: hitPrompt });
  const { bot } = await import("~/bot/index.ts");
  await bot.helpers.sendMessage(channelId, { content: hitNarration });

  // Display enemy health bar (using a simple text format since enemies don't have Discord IDs)
  const healthPercentage = Math.round(
    (newHealth / weakestEnemy.enemy.maxHealth) * 100,
  );
  const healthBarText = `[${"█".repeat(Math.floor(healthPercentage / 10))}${
    "░".repeat(10 - Math.floor(healthPercentage / 10))
  }] ${newHealth}/${weakestEnemy.enemy.maxHealth} (${healthPercentage}%)`;

  await bot.helpers.sendMessage(channelId, {
    content: `${weakestEnemy.enemy.name}'s health: ${healthBarText}`,
  });

  await checkEncounterStatus(encounter, channelId);
}
