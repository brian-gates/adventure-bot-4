import { prisma } from "~/db/index.ts";

export async function updatePlayerHealth({
  id,
  health,
  maxHealth,
}: {
  id: bigint;
  health: number;
  maxHealth?: number;
}) {
  return await prisma.player.update({
    where: { id },
    data: { health, ...(maxHealth !== undefined ? { maxHealth } : {}) },
  });
}

export async function createPlayer({
  id,
  name,
  health,
  maxHealth = 10,
  guildId,
}: {
  id: bigint;
  name: string;
  health: number;
  maxHealth?: number;
  guildId: bigint;
}) {
  return await prisma.player.create({
    data: {
      id,
      name,
      health,
      maxHealth,
      guildId,
    },
  });
}

export async function updatePlayerName({
  id,
  name,
}: {
  id: bigint;
  name: string;
}) {
  return await prisma.player.update({
    where: { id },
    data: { name },
  });
}

export async function getOrCreatePlayer({
  id,
  name,
  health = 10,
  maxHealth = 10,
  guildId,
}: {
  id: bigint;
  name: string;
  health?: number;
  maxHealth?: number;
  guildId: bigint;
}) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (player) {
    if (player.name !== name) {
      return await updatePlayerName({ id, name });
    }
    return player;
  }
  return await createPlayer({ id, name, health, maxHealth, guildId });
}
