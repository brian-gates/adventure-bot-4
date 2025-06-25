import { prisma } from "~/db/index.ts";
import { combatEmbedMessage } from "./message-components.ts";
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

export type EncounterWithCombatants = Prisma.EncounterGetPayload<{
  include: { enemies: true; players: true };
}>;

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
        random,
      }));
    } else {
      ({ encounter, players, enemies } = await processEnemyTurn({
        encounter,
        players,
        enemies,
        enemy: combatant,
        channelId,
        random,
      }));
    }

    // After each turn, check if the encounter has ended and refresh the state.
    await checkEncounterStatus(encounter, channelId);
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

  // Get user's avatar URL
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${
      Number(user.discriminator) % 5
    }.png`;

  // Determine attack parameters based on equipped weapon
  const attackSides = 20;
  const damageSides = equippedWeapon ? 4 + equippedWeapon.attack : 4; // Base 1d4 + weapon bonus

  // Create composed combat message with embed
  const combatResult = await combatEmbedMessage({
    attackerName: user.username,
    targetName: target.name,
    attackSides,
    damageSides,
    ac: 10,
    random,
    currentHealth: target.health,
    maxHealth: target.maxHealth,
    weaponName: equippedWeapon?.name || null,
    avatarUrl,
  });

  if (!combatResult.hit) {
    await bot.helpers.sendMessage(channelId, {
      embeds: [
        {
          author: {
            name: user.username,
            iconUrl: combatResult.avatarUrl,
          },
          description: combatResult.narration,
          image: { url: `attachment://${combatResult.fileName}` },
        },
      ],
      file: {
        blob: new Blob([combatResult.composedImage]),
        name: combatResult.fileName,
      },
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
    embeds: [
      {
        author: {
          name: user.username,
          iconUrl: combatResult.avatarUrl,
        },
        description: combatResult.narration,
        image: { url: `attachment://${combatResult.fileName}` },
      },
    ],
    file: {
      blob: new Blob([combatResult.composedImage]),
      name: combatResult.fileName,
    },
  });

  // Update enemies array
  const updatedEnemies = enemies.map((e) =>
    e.id === target.id ? updatedEnemy : e
  );

  return { encounter, players, enemies: updatedEnemies };
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

  // Create composed combat message with embed
  const combatResult = await combatEmbedMessage({
    attackerName: enemy.name,
    targetName: targetUser.username,
    attackSides: 20,
    damageSides: 4,
    ac: 10,
    random,
    currentHealth: target.health,
    maxHealth: target.maxHealth,
  });

  if (!combatResult.hit) {
    await bot.helpers.sendMessage(channelId, {
      embeds: [
        {
          description: combatResult.narration,
          image: { url: `attachment://${combatResult.fileName}` },
        },
      ],
      file: {
        blob: new Blob([combatResult.composedImage]),
        name: combatResult.fileName,
      },
    });
    return { encounter, players, enemies };
  }

  // Update player health
  const newHealth = Math.max(0, target.health - combatResult.damageRoll);
  const updatedPlayer = await updatePlayerHealth({
    playerId: target.id,
    newHealth,
  });

  // Send the composed message with embed
  await bot.helpers.sendMessage(channelId, {
    embeds: [
      {
        description: combatResult.narration,
        image: { url: `attachment://${combatResult.fileName}` },
      },
    ],
    file: {
      blob: new Blob([combatResult.composedImage]),
      name: combatResult.fileName,
    },
  });

  // Update players array
  const updatedPlayers = players.map((p) =>
    p.id === target.id ? updatedPlayer : p
  );

  return { encounter, players: updatedPlayers, enemies };
};
