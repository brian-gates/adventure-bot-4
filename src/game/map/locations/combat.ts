import { type Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { basicPlayerTemplate } from "~/game/players/player-templates.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import type { Enemy, Location } from "~/generated/prisma/client.ts";
import {
  enemyTemplatesByName,
  isEnemyTemplateKey,
} from "../../enemies/templates/index.ts";
import { bot } from "~/bot/index.ts";
import { narrate } from "~/llm/index.ts";
import { narrateEncounter } from "~/prompts.ts";

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

  const allPlayers = await prisma.player.findMany({ where: { guildId } });
  console.log(
    `[handleCombat] Found ${allPlayers.length} players in guild.`,
    allPlayers.map((p) => p.id),
  );
  if (allPlayers.length === 0) {
    await bot.helpers.sendMessage(channelId, {
      content: `No players found in this guild.`,
    });
    return;
  }

  // Generate enemies for this encounter
  const enemyType = weightedRandom(enemyWeights, random);
  const stats = enemyStats[enemyType];
  // For demo, spawn 1 enemy; you can randomize or scale as needed
  const enemiesToSpawn = 1;
  const enemyData = Array.from({ length: enemiesToSpawn }).map(() => ({
    name: enemyType,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    initiative: Math.floor(random() * 20),
  }));

  // Create the encounter tied to the current location
  const encounter = await prisma.encounter.create({
    data: {
      locationId: location.id,
      status: "active",
    },
  });

  // Update players to join the encounter
  await Promise.all(
    allPlayers.map((player) =>
      prisma.player.update({
        where: { id: player.id },
        data: {
          encounterId: encounter.id,
          initiative: Math.floor(random() * 20),
        },
      })
    ),
  );

  // Create enemies for the encounter
  const createdEnemies = await Promise.all(
    enemyData.map((edata) =>
      prisma.enemy.create({
        data: {
          ...edata,
          encounterId: encounter.id,
        },
      })
    ),
  );

  // Narrate the encounter scene
  const scenePrompt = narrateEncounter({
    enemyType,
    playerCount: allPlayers.length,
    playerIds: allPlayers.map((p) => p.id),
  });
  const sceneNarration = await narrate({ prompt: scenePrompt });
  await bot.helpers.sendMessage(channelId, { content: sceneNarration });

  // Prepare combatants
  const playerCombatants = allPlayers.map(() =>
    basicPlayerTemplate.create({
      channelId,
      guildId,
      random,
    })
  );

  const enemyCombatants = createdEnemies.map((e: Enemy) => {
    if (isEnemyTemplateKey(e.name)) {
      const template = enemyTemplatesByName.get(e.name);
      if (!template) {
        throw new Error(`No template for enemy: ${e.name}`);
      }
      return {
        ...template.create({
          random,
          channelId,
          guildId,
        }),
        initiative: e.initiative,
      };
    }
    throw new Error(`No template for enemy: ${e.name}`);
  });

  const combatants = [
    ...allPlayers.map((p, i) => ({
      ...playerCombatants[i],
      type: "player" as const,
      initiative: p.initiative || 0,
      playerId: p.id,
    })),
    ...createdEnemies.map((e: Enemy, i) => ({
      ...enemyCombatants[i],
      type: "enemy" as const,
      initiative: e.initiative,
      enemyId: e.id,
    })),
  ];

  combatants.sort((a, b) => b.initiative - a.initiative);

  let currentEncounter = encounter;
  while (currentEncounter.status === "active") {
    for (const combatant of combatants) {
      if (currentEncounter.status !== "active") break;

      if (combatant.type === "player") {
        // Find the actual player instance for this combatant
        const playerInstance = allPlayers.find((p) =>
          p.id === combatant.playerId
        );
        if (playerInstance) {
          await combatant.act({
            encounter: currentEncounter,
            player: playerInstance,
          });
        }
      } else {
        // For enemies, pass the enemy instance
        const enemyInstance = createdEnemies.find((e) =>
          e.id === combatant.enemyId
        );
        if (enemyInstance) {
          await combatant.act({
            encounter: currentEncounter,
            enemy: enemyInstance,
          });
        }
      }

      currentEncounter = await prisma.encounter.findUniqueOrThrow({
        where: { id: currentEncounter.id },
      });
    }
  }
}
