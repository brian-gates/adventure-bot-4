import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Encounter, Enemy, Location } from "~/generated/prisma/client.ts";

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

async function promptForJoiners({
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
  const joiners = new Set<string>();
  joiners.add(interaction.user!.id.toString());
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
      joiners.add(payload.userId.toString());
    }
  };
  bot.events.reactionAdd = handler;
  await new Promise((resolve) => setTimeout(resolve, 30000));
  bot.events.reactionAdd = () => {};
  return Array.from(joiners);
}

async function getOrCreateEnemy(
  enemyType: string,
  maxHealth: number,
): Promise<Enemy> {
  let enemy = await prisma.enemy.findFirst({ where: { name: enemyType } });
  if (!enemy) {
    enemy = await prisma.enemy.create({
      data: { name: enemyType, maxHealth },
    });
  }
  return enemy;
}

async function createEncounterWithPlayers({
  playerIds,
  enemy,
  random,
  guildId,
}: {
  playerIds: string[];
  enemy: Enemy;
  random: () => number;
  guildId: string;
}): Promise<(Encounter & { players: { playerId: string }[] }) | null> {
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
  });
  if (players.length === 0) return null;
  const encounter = await prisma.encounter.create({
    data: {
      turn: "player",
      status: "active",
      enemies: {
        create: [
          {
            enemyId: enemy.id,
            health: enemy.maxHealth,
          },
        ],
      },
      players: {
        create: players.map((player) => ({
          playerId: player.id,
          health: player.maxHealth,
          maxHealth: player.maxHealth,
        })),
      },
    },
    include: { enemies: true, players: { select: { playerId: true } } },
  });
  await prisma.guild.update({
    where: { id: BigInt(guildId) },
    data: { randomCursor: { increment: 1 } },
  });
  return encounter;
}

async function promptFirstPlayer({
  bot,
  channelId,
  enemy,
  encounter,
}: {
  bot: Bot;
  channelId: string;
  enemy: Enemy;
  encounter: Encounter & { players: { playerId: string }[] };
}) {
  const firstPlayer = encounter.players[0];
  await bot.helpers.sendMessage(channelId, {
    content:
      `A wild ${enemy.name} appears! It's your turn, <@${firstPlayer.playerId}>. Type /attack to strike!`,
  });
}

export async function handleCombat({
  bot,
  interaction,
  location,
  random,
}: {
  bot: Bot;
  interaction: Interaction;
  location: Location;
  random: () => number;
}) {
  if (!interaction.channelId || !interaction.guildId || !interaction.user?.id) {
    return;
  }
  const channelId = interaction.channelId.toString();
  const guildId = interaction.guildId.toString();
  const joiners = await promptForJoiners({ bot, interaction });
  if (joiners.length === 0) {
    await bot.helpers.sendMessage(channelId, {
      content: "No one joined the fight.",
    });
    return;
  }
  const guild = await prisma.guild.findUnique({
    where: { id: BigInt(guildId) },
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
    guildId,
  });
  if (!encounter) {
    await bot.helpers.sendMessage(channelId, {
      content: `No valid players found for this encounter.`,
    });
    return;
  }
  await promptFirstPlayer({ bot, channelId, enemy, encounter });
}
