import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { basicPlayerTemplate } from "~/game/players/player-templates.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Encounter, Enemy, Location } from "~/generated/prisma/client.ts";
import {
  enemyTemplatesByName,
  isEnemyTemplateKey,
} from "../../enemies/templates/index.ts";

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
  bot,
  interaction,
  random,
  location,
}: {
  bot: Bot;
  interaction: Interaction;
  location: Location;
  random: () => number;
}) {
  if (!interaction.channelId || !interaction.guildId || !interaction.user?.id) {
    return;
  }
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;
  const joiners = await rally({ bot, interaction });
  if (joiners.length === 0) {
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
    playerIds: joiners,
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

  const playerCombatants = players.map((p) =>
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
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}): Promise<string[]> {
  const channelId = interaction.channelId!.toString();
  const joinMessage = await bot.helpers.sendMessage(channelId, {
    content: `A wild enemy appears! React with ⚔️ to join the fight!`,
  });
  await bot.helpers.addReaction(
    joinMessage.channelId.toString(),
    joinMessage.id.toString(),
    "⚔️",
  );
  const rallied = new Set<string>();
  rallied.add(interaction.user!.id.toString());
  const handler = (
    _bot: Bot,
    payload: {
      userId: bigint;
      channelId: bigint;
      messageId: bigint;
      guildId?: bigint;
      member?: unknown;
      user?: unknown;
      emoji: { name?: string };
    },
  ) => {
    if (
      payload.messageId.toString() === joinMessage.id.toString() &&
      payload.emoji.name && payload.emoji.name === "⚔️"
    ) {
      rallied.add(payload.userId.toString());
    }
  };
  bot.events.reactionAdd = handler;
  await new Promise((resolve) => setTimeout(resolve, 30000));
  bot.events.reactionAdd = () => {};
  return Array.from(rallied);
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
  playerIds: string[];
  enemy: Enemy;
  random: () => number;
}): Promise<(Encounter & { players: { playerId: string }[] }) | null> {
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
