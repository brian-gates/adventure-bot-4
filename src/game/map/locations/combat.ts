import { type Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { getPlayer } from "~/db/player.ts";
import { basicPlayerTemplate } from "~/game/players/player-templates.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Enemy, Location, Player } from "~/generated/prisma/client.ts";
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
  console.log("[handleCombat] Starting combat handling.");
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;
  const playersWhoJoined = await rally({ channelId });

  console.log(
    `[handleCombat] ${playersWhoJoined.length} players returned from rally.`,
    playersWhoJoined,
  );

  if (playersWhoJoined.length === 0) {
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

  const playerIds = playersWhoJoined.map((p) => p.id);
  console.log("[handleCombat] Creating encounter with player IDs:", playerIds);
  const encounter = await createEncounterWithPlayers({
    playerIds,
    enemy,
    random,
  });
  if (!encounter) {
    console.log(
      "[handleCombat] createEncounterWithPlayers returned null. Sending 'No valid players' message.",
    );
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
      guildId,
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
        guildId,
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

  let currentEncounter = encounter;
  while (currentEncounter.status === "active") {
    for (const combatant of combatants) {
      if (currentEncounter.status !== "active") break;
      await combatant.act(currentEncounter);
      currentEncounter = await prisma.encounter.findUniqueOrThrow({
        where: { id: currentEncounter.id },
        include: {
          players: true,
          enemies: true,
        },
      });
    }
  }
}

async function rally({
  channelId,
}: {
  channelId: bigint;
}): Promise<Player[]> {
  const joinMessage = await bot.helpers.sendMessage(channelId, {
    content: `A wild enemy appears! React with ⚔️ to join the fight!`,
  });
  await bot.helpers.addReaction(
    joinMessage.channelId.toString(),
    joinMessage.id.toString(),
    "⚔️",
  );
  console.log("[rally] Waiting for reactions for 10 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const reactionUsers = await bot.helpers.getReactions(
    joinMessage.channelId.toString(),
    joinMessage.id.toString(),
    "⚔️",
  );
  console.log(`[rally] Got ${reactionUsers.size} reaction users.`);

  const humanUsers = Array.from(reactionUsers.values()).filter(
    (user) => !user.toggles.has("bot"),
  );
  console.log(`[rally] Filtered down to ${humanUsers.length} human users.`);

  if (humanUsers.length === 0) {
    console.log("[rally] No human users joined. Returning empty array.");
    return [];
  }

  console.log("[rally] Finding or creating players for human users...");
  const players = await Promise.all(
    humanUsers.map((user) => getPlayer({ id: user.id, name: user.username })),
  );
  console.log(
    "[rally] Finished creating players. Returning players:",
    players.map((p: Player) => p.id),
  );

  return players;
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
  console.log("[createEncounterWithPlayers] Received player IDs:", playerIds);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
  });
  console.log(
    `[createEncounterWithPlayers] Found ${players.length} players in DB from IDs.`,
    players.map((p) => p.id),
  );
  if (players.length === 0) {
    console.log(
      "[createEncounterWithPlayers] No players found in DB, returning null.",
    );
    return null;
  }

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
          player: { connect: { id: player.id } },
          initiative: initiative(),
        })),
      },
    },
    include: { enemies: true, players: { select: { playerId: true } } },
  });
  return encounter;
}
