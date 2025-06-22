import { prisma } from "~/db/index.ts";
import { rollAndAnnounceDie } from "../dice.ts";
import { narrate } from "~/llm/index.ts";
import { narrateCombatAction } from "~/prompts.ts";
import type { Encounter, Enemy, Player } from "~/generated/prisma/client.ts";

export async function attackWeakestPlayer({
  random,
  attacker,
  channelId,
  guildId,
  encounter,
}: {
  channelId: bigint;
  guildId: bigint;
  random: () => number;
  encounter: Encounter;
  attacker: Enemy | Player;
}) {
  const weakestPlayer = await prisma.player.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      health: "asc",
    },
  });

  if (!weakestPlayer) {
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
      target: weakestPlayer.name,
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

  const newHealth = Math.max(0, weakestPlayer.health - damage);

  // Update player health
  await prisma.player.update({
    where: { id: weakestPlayer.id },
    data: { health: newHealth },
  });

  // Narrate the hit
  const hitPrompt = narrateCombatAction({
    attacker: attacker.name,
    target: weakestPlayer.name,
    hit: true,
    damage,
    newHealth,
    maxHealth: weakestPlayer.maxHealth,
  });
  const hitNarration = await narrate({ prompt: hitPrompt });
  const { bot } = await import("~/bot/index.ts");
  await bot.helpers.sendMessage(channelId, { content: hitNarration });

  // Display player health bar using the proper health bar system
  const { displayHealthBar } = await import("~/ui/health-bar.ts");
  await displayHealthBar({
    channelId,
    playerId: weakestPlayer.id,
    currentHealth: newHealth,
    maxHealth: weakestPlayer.maxHealth,
  });

  const { checkEncounterStatus } = await import("../check-encounter-status.ts");
  await checkEncounterStatus(encounter, channelId);
}
