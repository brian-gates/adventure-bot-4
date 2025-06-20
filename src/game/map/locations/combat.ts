import type { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { basicPlayerTemplate } from "~/game/players/player-templates.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Encounter, Enemy, Location } from "~/generated/prisma/client.ts";
import {
  enemyTemplatesByName,
  isEnemyTemplateKey,
} from "../../enemies/templates/index.ts";
import { bot } from "~/bot/index.ts";

const enemyWeights = {
  goblin: 5,
  orc: 2,
  slime: 3,
};
const enemyStats = {
  goblin: { maxHealth: 10 },
  orc: { maxHealth: 18 },
  slime: { maxHealth: 8 },
};

export async function handleCombat({
  interaction,
  random,
}: {
  interaction: Interaction;
  location: Location;
  random: () => number;
}) {
  if (!interaction.channelId || !interaction.guildId || !interaction.user?.id) {
    return;
  }
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;
  const joiners = await rally({ channelId });
  if (joiners.size === 0) {
    await bot.helpers.sendMessage(channelId, {
      content: "No one joined the fight.",
    });
    return;
  }
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
  });
  if (!guild) {
    await bot.helpers.sendMessage(channelId, {
      content: `No guild found for this encounter.`,
    });
    return;
  }
  const enemyType = weightedRandom(enemyWeights, random);
  const stats = enemyStats[enemyType];
  const enemy = await getOrCreateEnemy(enemyType, stats.maxHealth);
  const encounter = await createEncounterWithPlayers({
    playerIds: Array.from(joiners.keys()),
    enemy,
    random,
  });
  if (!encounter) {
    await bot.helpers.sendMessage(channelId, {
      content: `No valid players found for this encounter.`,
    });
    return;
  }

  const encounterId = encounter.id;

  const players = await prisma.encounterPlayer.findMany({
    where: { encounterId },
    include: { player: true },
  });

  const enemies = await prisma.encounterEnemy.findMany({
    where: { encounterId },
    include: { enemy: true },
  });

  const playerCombatants = players.map(() =>
    basicPlayerTemplate.create({
      channelId,
      random,
    })
  );

  const enemyCombatants = enemies.map((e) => {
    if (isEnemyTemplateKey(e.enemy.name)) {
      const template = enemyTemplatesByName.get(e.enemy.name);
      if (!template) {
        throw new Error(`No template for enemy: ${e.enemy.name}`);
      }
      return template.create({
        random,
        channelId,
      });
    }
    throw new Error(`No template for enemy: ${e.enemy.name}`);
  });

  const combatants = [
    ...players.map((p, i) => ({
      ...playerCombatants[i],
      type: "player",
      initiative: p.initiative,
    })),
    ...enemies.map((e, i) => ({
      ...enemyCombatants[i],
      type: "enemy",
      initiative: e.initiative,
    })),
  ];

  combatants.sort((a, b) => b.initiative - a.initiative);

  while (encounter.status === "active") {
    for (const combatant of combatants) {
      await combatant.act(encounter);
    }
  }
}

async function rally({
  channelId,
}: {
  channelId: bigint;
}) {
  const joinMessage = await bot.helpers.sendMessage(channelId, {
    content: `A wild enemy appears! React with ⚔️ to join the fight!`,
  });
  await bot.helpers.addReaction(
    joinMessage.channelId.toString(),
    joinMessage.id.toString(),
    "⚔️",
  );
  await new Promise((resolve) => setTimeout(resolve, 30000));
  return bot.helpers.getReactions(
    joinMessage.channelId.toString(),
    joinMessage.id.toString(),
    "⚔️",
  );
}

async function getOrCreateEnemy(
  enemyType: string,
  maxHealth: number,
): Promise<Enemy> {
  let enemy = await prisma.enemy.findFirst({ where: { name: enemyType } });
  if (!enemy) {
    enemy = await prisma.enemy.create({
      data: { name: enemyType, maxHealth, health: maxHealth },
    });
  }
  return enemy;
}

async function createEncounterWithPlayers({
  playerIds,
  enemy,
  random,
}: {
  playerIds: bigint[];
  enemy: Enemy;
  random: () => number;
}) {
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
  });
  if (players.length === 0) return null;

  const initiative = () => Math.floor(random() * 20);

  const encounter = await prisma.encounter.create({
    data: {
      status: "active",
      enemies: {
        create: [
          {
            enemyId: enemy.id,
            initiative: initiative(),
          },
        ],
      },
      players: {
        create: players.map((player) => ({
          playerId: player.id,
          player: { connect: { id: player.id } },
          initiative: initiative(),
        })),
      },
    },
    include: { enemies: true, players: { select: { playerId: true } } },
  });
  return encounter;
}
