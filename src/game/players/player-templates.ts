import { prisma } from "~/db/index.ts";
import type { Encounter, Player } from "~/generated/prisma/client.ts";
import { checkEncounterStatus } from "../check-encounter-status.ts";
import { rollAndAnnounceDie } from "../dice.ts";
import { narrate } from "~/llm/index.ts";
import { narrateCombatAction } from "~/prompts.ts";
import { displayHealthBar } from "~/ui/health-bar.ts";

export type PlayerTemplate = {
  create: (ctx: {
    random: () => number;
    channelId: bigint;
  }) => {
    name: string;
    maxHealth: number;
    health: number;
    abilities: string[];
    act: (
      { encounter, self }: { encounter: Encounter; self: Player },
    ) => Promise<void>;
  };
};

export const basicPlayerTemplate: PlayerTemplate = {
  create: ({ random, channelId }) => ({
    name: "Basic Player",
    maxHealth: 10,
    health: 10,
    abilities: ["attack"],
    act: async ({ encounter, self }) => {
      await attackWeakestEnemy({
        random,
        channelId,
        encounter,
        attacker: self,
      });
    },
  }),
};

async function attackWeakestEnemy({
  random,
  channelId,
  encounter,
  attacker,
}: {
  random: () => number;
  channelId: bigint;
  encounter: Encounter;
  attacker: Player;
}) {
  const weakestEnemy = await prisma.enemy.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      health: "asc",
    },
  });

  if (!weakestEnemy) {
    return;
  }

  const { roll: attack } = await rollAndAnnounceDie({
    channelId,
    sides: 20,
    label: "attack",
    random,
  });

  const hit = attack > 10; // Simple AC 10 for now

  if (!hit) {
    // Narrate the miss
    const missPrompt = narrateCombatAction({
      attacker: attacker.name,
      target: weakestEnemy.name,
      hit: false,
    });
    const missNarration = await narrate({ prompt: missPrompt });
    const { bot } = await import("~/bot/index.ts");
    await bot.helpers.sendMessage(channelId, { content: missNarration });
    return;
  }

  const { roll: damage } = await rollAndAnnounceDie({
    channelId,
    sides: 4,
    label: "1d4 (unarmed)",
    random,
  });

  const newHealth = Math.max(0, weakestEnemy.health - damage);

  // Update enemy health
  await prisma.enemy.update({
    where: { id: weakestEnemy.id },
    data: { health: newHealth },
  });

  // Narrate the hit
  const hitPrompt = narrateCombatAction({
    attacker: attacker.name,
    target: weakestEnemy.name,
    hit: true,
    damage,
    newHealth,
    maxHealth: weakestEnemy.maxHealth,
  });
  const hitNarration = await narrate({ prompt: hitPrompt });
  const { bot } = await import("~/bot/index.ts");
  await bot.helpers.sendMessage(channelId, { content: hitNarration });

  await displayHealthBar({
    channelId,
    entity: weakestEnemy,
    current: newHealth,
    max: weakestEnemy.maxHealth,
    damage,
  });

  await checkEncounterStatus(encounter, channelId);
}
