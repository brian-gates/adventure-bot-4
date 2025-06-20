import { prisma } from "~/db/index.ts";

export async function setPlayerHealth({
  id,
  health,
  maxHealth,
}: {
  id: string;
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
}: {
  id: string;
  name: string;
  health: number;
  maxHealth?: number;
}) {
  return await prisma.player.create({ data: { id, name, health, maxHealth } });
}

export async function getPlayer({
  id,
  name,
  health = 10,
  maxHealth = 10,
}: {
  id: string;
  name: string;
  health?: number;
  maxHealth?: number;
}) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (player) return player;
  return await createPlayer({ id, name, health, maxHealth });
}
