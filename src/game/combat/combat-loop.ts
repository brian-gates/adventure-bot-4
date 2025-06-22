import { prisma } from "~/db/index.ts";
import { combatMessage } from "./message-components.ts";
import {
  findWeakestEnemy,
  findWeakestPlayer,
  updateEnemyHealth,
  updatePlayerHealth,
} from "./combat-utils.ts";
import type {
  Encounter,
  Enemy,
  Player,
  Prisma,
} from "~/generated/prisma/client.ts";
import { bot } from "~/bot/index.ts";

export type EncounterWithCombatants = Prisma.EncounterGetPayload<{
  include: { enemies: true; players: true };
}>;

export const initializeCombat = async ({
  playersInCombat,
  enemyData,
  encounter,
}: {
  playersInCombat: Player[];
  enemyData: Array<{
    name: string;
    maxHealth: number;
    health: number;
    initiative: number;
  }>;
  encounter: Encounter;
}) => {
  // Join players to encounter
  const players = await Promise.all(
    playersInCombat.map((player) =>
      prisma.player.update({
        where: { id: player.id },
        data: {
          encounterId: encounter.id,
          initiative: Math.floor(Math.random() * 20),
        },
      })
    ),
  );

  // Create enemies
  const enemies = await Promise.all(
    enemyData.map((edata) =>
      prisma.enemy.create({
        data: {
          ...edata,
          encounterId: encounter.id,
        },
      })
    ),
  );

  return { encounter, players, enemies };
};

export const processCombatRound = async ({
  encounter,
  players,
  enemies,
  channelId,
  guildId,
  random,
}: {
  encounter: EncounterWithCombatants;
  players: Player[];
  enemies: Enemy[];
  channelId: bigint;
  guildId: bigint;
  random: () => number;
}) => {
  // Sort by initiative
  const allCombatants = [
    ...players.map((p) => ({ ...p, type: "player" as const })),
    ...enemies.map((e) => ({ ...e, type: "enemy" as const })),
  ].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

  // Process each combatant's turn
  for (const combatant of allCombatants) {
    if (encounter.status !== "active") break;

    if (combatant.type === "player") {
      ({ encounter, players, enemies } = await processPlayerTurn({
        encounter,
        players,
        enemies,
        player: combatant,
        channelId,
        guildId,
        random,
      }));
    } else {
      ({ encounter, players, enemies } = await processEnemyTurn({
        encounter,
        players,
        enemies,
        enemy: combatant,
        channelId,
        guildId,
        random,
      }));
    }

    // Refresh encounter status
    encounter = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounter.id },
      include: {
        enemies: true,
        players: true,
      },
    });
  }

  return { encounter, players, enemies };
};

const processPlayerTurn = async ({
  encounter,
  players,
  enemies,
  player,
  channelId,
  guildId,
  random,
}: {
  encounter: EncounterWithCombatants;
  players: Player[];
  enemies: Enemy[];
  player: Player;
  channelId: bigint;
  guildId: bigint;
  random: () => number;
}) => {
  if (player.health <= 0) return { encounter, players, enemies };

  const target = await findWeakestEnemy({ encounterId: encounter.id });
  if (!target) return { encounter, players, enemies };

  // Create composed combat message
  const combatResult = await combatMessage({
    guildId,
    attackerId: player.id,
    attackerName: player.name,
    targetName: target.name,
    attackSides: 20,
    damageSides: 4,
    attackLabel: "attack",
    damageLabel: "1d4 (unarmed)",
    ac: 10,
    random,
    includeHealthBar: true,
    currentHealth: target.health,
    maxHealth: target.maxHealth,
  });

  if (!combatResult.hit) {
    await bot.helpers.sendMessage(channelId, {
      content: combatResult.message,
    });
    return { encounter, players, enemies };
  }

  // Update enemy health
  const newHealth = Math.max(0, target.health - combatResult.damageRoll);
  const updatedEnemy = await updateEnemyHealth({
    enemyId: target.id,
    newHealth,
  });

  await bot.helpers.sendMessage(channelId, {
    content: combatResult.message,
    file: combatResult.healthBarImage
      ? {
        blob: new Blob([combatResult.healthBarImage]),
        name: "healthbar.png",
      }
      : undefined,
  });

  // Update enemies array
  const updatedEnemies = enemies.map((e) =>
    e.id === target.id ? updatedEnemy : e
  );

  // Check encounter status
  const { checkEncounterStatus } = await import("../check-encounter-status.ts");
  await checkEncounterStatus(encounter, channelId);

  return { encounter, players, enemies: updatedEnemies };
};

const processEnemyTurn = async ({
  encounter,
  players,
  enemies,
  enemy,
  channelId,
  guildId,
  random,
}: {
  encounter: EncounterWithCombatants;
  players: Player[];
  enemies: Enemy[];
  enemy: Enemy;
  channelId: bigint;
  guildId: bigint;
  random: () => number;
}) => {
  if (enemy.health <= 0) return { encounter, players, enemies };

  const target = await findWeakestPlayer({ encounterId: encounter.id });
  if (!target) return { encounter, players, enemies };

  // Create composed combat message
  const combatResult = await combatMessage({
    guildId,
    attackerName: enemy.name,
    targetName: target.name,
    attackSides: 20,
    damageSides: 4,
    attackLabel: "attack",
    damageLabel: "1d4 (unarmed)",
    ac: 10,
    random,
    includeHealthBar: true,
    currentHealth: target.health,
    maxHealth: target.maxHealth,
  });

  if (!combatResult.hit) {
    const { bot } = await import("~/bot/index.ts");
    await bot.helpers.sendMessage(channelId, {
      content: combatResult.message,
    });
    return { encounter, players, enemies };
  }

  // Update player health
  const newHealth = Math.max(0, target.health - combatResult.damageRoll);
  const updatedPlayer = await updatePlayerHealth({
    playerId: target.id,
    newHealth,
  });

  // Send the composed message with health bar
  const { bot } = await import("~/bot/index.ts");
  await bot.helpers.sendMessage(channelId, {
    content: combatResult.message,
    file: combatResult.healthBarImage
      ? {
        blob: new Blob([combatResult.healthBarImage]),
        name: "healthbar.png",
      }
      : undefined,
  });

  // Update players array
  const updatedPlayers = players.map((p) =>
    p.id === target.id ? updatedPlayer : p
  );

  // Check encounter status
  const { checkEncounterStatus } = await import("../check-encounter-status.ts");
  await checkEncounterStatus(encounter, channelId);

  return { encounter, players: updatedPlayers, enemies };
};
