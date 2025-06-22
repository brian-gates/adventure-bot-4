import { type Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import type { Location, Player } from "~/generated/prisma/client.ts";
import { bot } from "~/bot/index.ts";
import { narrate } from "~/llm/index.ts";
import { narrateEncounter } from "~/prompts.ts";
import { getOrCreatePlayer } from "~/db/player.ts";
import { findOrCreateEncounter } from "~/db/encounter.ts";
import { generateEnemies } from "~/game/enemies/enemy-generation.ts";
import {
  initializeCombat,
  processCombatRound,
} from "~/game/combat/combat-loop.ts";

async function getOrCreatePlayersForCombat({
  guildId,
  userId,
  username,
  channelId,
}: {
  guildId: bigint;
  userId: bigint;
  username: string;
  channelId: bigint;
}): Promise<Player[]> {
  // ensure the player exists
  await getOrCreatePlayer({
    id: userId,
    name: username,
    guildId,
  });
  const foundPlayers = await prisma.player.findMany({ where: { guildId } });
  console.log(
    `[handleCombat] Found ${foundPlayers.length} players in guild.`,
    foundPlayers.map((p) => p.id),
  );

  if (foundPlayers.length === 0) {
    await bot.helpers.sendMessage(channelId, {
      content:
        `No players found in this guild. Created a new adventurer for you!`,
    });
    return [
      await prisma.player.create({
        data: {
          id: userId,
          name: username ?? `Player ${userId}`,
          health: 10,
          maxHealth: 10,
          guildId,
        },
      }),
    ];
  }

  return foundPlayers;
}

export async function handleCombat({
  interaction,
  location,
  random,
}: {
  interaction: Interaction;
  location: Location;
  random: () => number;
}) {
  const { channelId, guildId, user } = interaction;
  if (!channelId || !guildId || !user?.id) {
    return;
  }
  console.log("[handleCombat] Starting combat handling.");

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
  });
  if (!guild) {
    await bot.helpers.sendMessage(channelId, {
      content: `No guild found for this encounter.`,
    });
    return;
  }

  const playersInCombat = await getOrCreatePlayersForCombat({
    guildId,
    userId: user.id,
    username: user.username ?? `Player ${user.id}`,
    channelId,
  });

  const encounter = await findOrCreateEncounter({ locationId: location.id });
  let enemyData: Array<{
    name: string;
    maxHealth: number;
    health: number;
    initiative: number;
  }> = [];

  if (encounter.enemies.length === 0) {
    const { enemies: newEnemies, enemyType } = generateEnemies(random);
    enemyData = newEnemies;
    // Narrate the encounter scene
    await bot.helpers.sendMessage(channelId, {
      content: await narrate({
        prompt: narrateEncounter({
          enemyType,
          playerIds: playersInCombat.map((p) => p.id),
        }),
      }),
    });
  }

  // Initialize combat state by creating enemies and joining players.
  await initializeCombat({
    playersInCombat,
    enemyData,
    encounter,
  });

  // Get latest encounter state
  let currentEncounter = await prisma.encounter.update({
    where: { id: encounter.id },
    data: { status: "active" },
    include: { players: true, enemies: true },
  });
  let { players, enemies } = currentEncounter;

  // Main combat loop - process rounds until combat ends
  console.log(
    `[handleCombat] Starting combat loop. Players: ${players.length}, Enemies: ${enemies.length}`,
  );

  while (currentEncounter.status === "active") {
    ({ encounter: currentEncounter, players, enemies } =
      await processCombatRound({
        encounter: currentEncounter,
        players,
        enemies,
        channelId,
        guildId,
        random,
      }));
  }

  console.log(
    `[handleCombat] Combat ended with status: ${currentEncounter.status}`,
  );
}
