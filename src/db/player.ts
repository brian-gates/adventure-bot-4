import { prisma } from "~/db/index.ts";

export async function getPlayer({ id }: { id: string }) {
  return await prisma.player.findUnique({ where: { id } });
}

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

export async function findOrCreatePlayer({
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
  try {
    let player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      player = await prisma.player.create({
        data: { id, name, health, maxHealth },
      });
    }
    return player;
  } catch (err) {
    console.error("Prisma error in findOrCreatePlayer:", err);
    throw err;
  }
}

export async function setPlayerLastTarget({
  id,
  lastTarget,
}: {
  id: string;
  lastTarget: string;
}) {
  return await prisma.player.update({
    where: { id },
    data: { lastTarget },
  });
}
