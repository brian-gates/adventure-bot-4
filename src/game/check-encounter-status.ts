import { bot } from "~/bot/index.ts";
import { prisma } from "~/db/index.ts";
import type { Encounter } from "~/generated/prisma/client.ts";

export async function checkEncounterStatus(
  encounter: Encounter,
  channelId: bigint,
) {
  const playersInEncounter = await prisma.encounterPlayer.findMany({
    where: { encounterId: encounter.id },
    include: { player: true },
  });
  const allPlayersDefeated = playersInEncounter.every(
    (p) => p.player.health <= 0,
  );

  if (allPlayersDefeated) {
    await prisma.encounter.update({
      where: { id: encounter.id },
      data: { status: "defeat" },
    });
    await bot.helpers.sendMessage(channelId, {
      content: "Your party has been defeated!",
    });
    return;
  }

  const enemiesInEncounter = await prisma.encounterEnemy.findMany({
    where: { encounterId: encounter.id },
    include: { enemy: true },
  });
  const allEnemiesDefeated = enemiesInEncounter.every(
    (e) => e.enemy.health <= 0,
  );

  if (allEnemiesDefeated) {
    await prisma.encounter.update({
      where: { id: encounter.id },
      data: { status: "victory" },
    });
    await bot.helpers.sendMessage(channelId, {
      content: "You are victorious!",
    });
  }
}
