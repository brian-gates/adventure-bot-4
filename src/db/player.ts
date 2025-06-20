import { prisma } from "~/db/index.ts";

export async function setPlayerHealth({
  id,
  health,
  maxHealth,
  channelId,
  healAmount = 0,
  damageAmount = 0,
}: {
  id: bigint;
  health: number;
  maxHealth?: number;
  channelId: bigint;
  healAmount?: number;
  damageAmount?: number;
}) {
  const player = await prisma.player.update({
    where: { id },
    data: { health, ...(maxHealth !== undefined ? { maxHealth } : {}) },
  });

  // Display health bar if channelId is provided
  if (channelId) {
    const { displayHealthBar } = await import("~/ui/health-bar.ts");
    await displayHealthBar({
      channelId,
      playerId: id,
      currentHealth: health,
      maxHealth: player.maxHealth,
      healAmount,
      damageAmount,
    });
  }

  return player;
}

export async function createPlayer({
  id,
  name,
  health,
  maxHealth = 10,
}: {
  id: bigint;
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
  id: bigint;
  name: string;
  health?: number;
  maxHealth?: number;
}) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (player) return player;
  return await createPlayer({ id, name, health, maxHealth });
}
