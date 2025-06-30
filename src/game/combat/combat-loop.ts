import { prisma } from "~/db/index.ts";
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
import { checkEncounterStatus } from "../check-encounter-status.ts";
import { resolveCombatAction } from "./message-components.ts";

export type EncounterWithCombatants = Prisma.EncounterGetPayload<{
  include: { enemies: true; players: true };
}>;

export type ActionLog = {
  attacker: string;
  target: string;
  hit: boolean;
  damage?: number;
  critical?: boolean;
  defeated?: boolean;
  actionDescription?: string;
};

// Function to get player's equipped weapon
async function getPlayerEquippedWeapon(playerId: bigint) {
  const equippedWeapon = await prisma.playerInventory.findFirst({
    where: {
      playerId,
      equipped: true,
      gear: {
        type: "weapon",
      },
    },
    include: {
      gear: true,
    },
  });

  return equippedWeapon?.gear || null;
}

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
  random,
}: {
  encounter: EncounterWithCombatants;
  players: Player[];
  enemies: Enemy[];
  channelId: bigint;
  random: () => number;
}) => {
  const actionLogs: ActionLog[] = [];

  // Sort by initiative
  const allCombatants = [
    ...players.map((p) => ({ ...p, type: "player" as const })),
    ...enemies.map((e) => ({ ...e, type: "enemy" as const })),
  ].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

  for (const combatant of allCombatants) {
    if (encounter.status !== "active") break;

    let actionLog;
    if (combatant.type === "player") {
      ({ encounter, players, enemies, actionLog } = await processPlayerTurn({
        encounter,
        players,
        enemies,
        player: combatant,
        channelId,
        random,
      }));
    } else {
      ({ encounter, players, enemies, actionLog } = await processEnemyTurn({
        encounter,
        players,
        enemies,
        enemy: combatant,
        channelId,
        random,
      }));
    }
    if (actionLog) actionLogs.push(actionLog);

    await checkEncounterStatus(encounter, channelId);
    encounter = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounter.id },
      include: {
        enemies: true,
        players: true,
      },
    });
  }

  return { encounter, players, enemies, actionLogs };
};

const processPlayerTurn = async ({
  encounter,
  players,
  enemies,
  player,
  channelId,
  random,
}: {
  encounter: EncounterWithCombatants;
  players: Player[];
  enemies: Enemy[];
  player: Player;
  channelId: bigint;
  random: () => number;
}) => {
  if (player.health <= 0) return { encounter, players, enemies };

  const target = await findWeakestEnemy({ encounterId: encounter.id });
  if (!target) return { encounter, players, enemies };

  const user = await bot.helpers.getUser(player.id);
  const equippedWeapon = await getPlayerEquippedWeapon(player.id);

  // Determine attack parameters based on equipped weapon
  const attackBonus = equippedWeapon ? equippedWeapon.attack : 0;
  const damageDice = equippedWeapon?.damageDice || "d4";

  // Use pure combat logic
  const combatResult = resolveCombatAction({
    attackBonus,
    damageDice,
    ac: 10,
    random,
    targetHealth: target.health,
  });

  let actionLog;
  if (!combatResult.hit) {
    actionLog = {
      attacker: user.username,
      target: target.name,
      hit: false,
      actionDescription: undefined,
    };
    return { encounter, players, enemies, actionLog };
  }

  // Update enemy health
  const newHealth = Math.max(0, target.health - combatResult.damageRoll);
  const updatedEnemy = await updateEnemyHealth({
    enemyId: target.id,
    newHealth,
  });

  // Update enemies array
  const updatedEnemies = enemies.map((e) =>
    e.id === target.id ? updatedEnemy : e
  );

  actionLog = {
    attacker: user.username,
    target: target.name,
    hit: true,
    damage: combatResult.damageRoll,
    critical: combatResult.d20 === 20,
    defeated: newHealth === 0,
    actionDescription: undefined,
  };

  return { encounter, players, enemies: updatedEnemies, actionLog };
};

const processEnemyTurn = async ({
  encounter,
  players,
  enemies,
  enemy,
  channelId,
  random,
}: {
  encounter: EncounterWithCombatants;
  players: Player[];
  enemies: Enemy[];
  enemy: Enemy;
  channelId: bigint;
  random: () => number;
}) => {
  if (enemy.health <= 0) return { encounter, players, enemies };

  const target = await findWeakestPlayer({ encounterId: encounter.id });
  if (!target) return { encounter, players, enemies };

  const targetUser = await bot.helpers.getUser(target.id);

  // Use pure combat logic
  const combatResult = resolveCombatAction({
    attackBonus: 0,
    damageDice: "d4",
    ac: 10,
    random,
    targetHealth: target.health,
  });

  let actionLog;
  if (!combatResult.hit) {
    actionLog = {
      attacker: enemy.name,
      target: targetUser.username,
      hit: false,
      actionDescription: undefined,
    };
    return { encounter, players, enemies, actionLog };
  }

  // Update player health
  const newHealth = Math.max(0, target.health - combatResult.damageRoll);
  const updatedPlayer = await updatePlayerHealth({
    playerId: target.id,
    newHealth,
  });

  // Update players array
  const updatedPlayers = players.map((p) =>
    p.id === target.id ? updatedPlayer : p
  );

  actionLog = {
    attacker: enemy.name,
    target: targetUser.username,
    hit: true,
    damage: combatResult.damageRoll,
    critical: combatResult.d20 === 20,
    defeated: newHealth === 0,
    actionDescription: undefined,
  };

  return { encounter, players: updatedPlayers, enemies, actionLog };
};
