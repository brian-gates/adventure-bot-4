import { prisma } from "~/db/index.ts";
import type { Encounter, Enemy, Player } from "~/generated/prisma/client.ts";
import { rollDie } from "../dice.ts";
import {
  type CombatActionResult,
  renderCombatAction,
} from "~/game/ui/renderers/combat-renderer.ts";
import { checkEncounterStatus } from "../check-encounter-status.ts";

export interface AttackWeakestPlayerResult {
  success: boolean;
  combatResult?: CombatActionResult;
  error?: string;
}

export async function attackWeakestPlayer({
  random,
  attacker,
  channelId,
  encounter,
}: {
  channelId: bigint;
  random: () => number;
  encounter: Encounter;
  attacker: Enemy | Player;
}): Promise<AttackWeakestPlayerResult> {
  // Find the weakest player
  const weakestPlayer = await prisma.player.findFirst({
    where: { encounterId: encounter.id },
    orderBy: { health: "asc" },
  });

  if (!weakestPlayer) {
    return { success: false, error: "No players found in encounter" };
  }

  // Game logic: Roll attack and determine hit
  const attackRoll = rollDie({ sides: 20, random });
  const hit = attackRoll > 10; // Simple AC 10 for now
  let damage = 0;
  let newHealth = weakestPlayer.health;

  if (hit) {
    // Game logic: Roll damage and update health
    damage = rollDie({ sides: 4, random });
    newHealth = Math.max(0, weakestPlayer.health - damage);

    // Update player health in database
    await prisma.player.update({
      where: { id: weakestPlayer.id },
      data: { health: newHealth },
    });
  }

  // Create combat result for UI rendering
  const combatResult: CombatActionResult = {
    attacker: attacker.name,
    target: weakestPlayer.name,
    hit,
    damage,
    attackRoll,
    damageRoll: damage,
    newHealth,
    maxHealth: weakestPlayer.maxHealth,
  };

  // Render the UI (separated from game logic)
  await renderCombatAction(combatResult, {
    channelId,
    avatarUrl: "attachment://crossed-swords.png",
    includeHealthBar: true,
  });

  // Check encounter status after the action
  await checkEncounterStatus(encounter, channelId);

  return { success: true, combatResult };
}
