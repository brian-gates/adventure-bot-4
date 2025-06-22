import { prisma } from "~/db/index.ts";
import type { Encounter } from "~/generated/prisma/client.ts";

export async function findOrCreateEncounter(
  locationId: string,
): Promise<Encounter> {
  let encounter = await prisma.encounter.findUnique({
    where: { locationId },
  });
  if (!encounter) {
    encounter = await prisma.encounter.create({
      data: {
        locationId,
        status: "active",
      },
    });
  }
  return encounter;
}

export const findPlayersInEncounter = async (
  { encounterId }: { encounterId: string },
) => {
  return await prisma.player.findMany({
    where: { encounterId },
  });
};

export const findEnemiesInEncounter = async (
  { encounterId }: { encounterId: string },
) => {
  return await prisma.enemy.findMany({
    where: { encounterId },
  });
};

export const findAlivePlayers = async (
  { encounterId }: { encounterId: string },
) => {
  const players = await findPlayersInEncounter({ encounterId });
  return players.filter((player) => player.health > 0);
};

export const findAliveEnemies = async (
  { encounterId }: { encounterId: string },
) => {
  const enemies = await findEnemiesInEncounter({ encounterId });
  return enemies.filter((enemy) => enemy.health > 0);
};

export const findWeakestPlayer = async (
  { encounterId }: { encounterId: string },
) => {
  const alivePlayers = await findAlivePlayers({ encounterId });
  if (alivePlayers.length === 0) return null;

  return alivePlayers.reduce((weakest, current) =>
    current.health < weakest.health ? current : weakest
  );
};

export const findWeakestEnemy = async (
  { encounterId }: { encounterId: string },
) => {
  const aliveEnemies = await findAliveEnemies({ encounterId });
  if (aliveEnemies.length === 0) return null;

  return aliveEnemies.reduce((weakest, current) =>
    current.health < weakest.health ? current : weakest
  );
};

export const updatePlayerHealth = async ({
  playerId,
  newHealth,
}: {
  playerId: bigint;
  newHealth: number;
}) => {
  return await prisma.player.update({
    where: { id: playerId },
    data: { health: newHealth },
  });
};

export const updateEnemyHealth = async ({
  enemyId,
  newHealth,
}: {
  enemyId: string;
  newHealth: number;
}) => {
  return await prisma.enemy.update({
    where: { id: enemyId },
    data: { health: newHealth },
  });
};

export const joinEncounter = async ({
  playerId,
  encounterId,
  initiative,
}: {
  playerId: bigint;
  encounterId: string;
  initiative: number;
}) => {
  return await prisma.player.update({
    where: { id: playerId },
    data: {
      encounterId,
      initiative,
    },
  });
};

export const leaveEncounter = async ({ playerId }: { playerId: bigint }) => {
  return await prisma.player.update({
    where: { id: playerId },
    data: {
      encounterId: null,
      initiative: null,
    },
  });
};
