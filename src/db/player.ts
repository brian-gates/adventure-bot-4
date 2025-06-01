import { PrismaClient } from "../generated/prisma/client.ts";

export const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
});

export async function getPlayer({ id }: { id: string }) {
  return await prisma.player.findUnique({ where: { id } });
}

export async function setPlayerHealth({
  id,
  health,
}: {
  id: string;
  health: number;
}) {
  return await prisma.player.update({ where: { id }, data: { health } });
}

export async function createPlayer({
  id,
  name,
  health,
}: {
  id: string;
  name: string;
  health: number;
}) {
  return await prisma.player.create({ data: { id, name, health } });
}

export async function findOrCreatePlayer({
  id,
  name,
  health = 10,
}: {
  id: string;
  name: string;
  health?: number;
}) {
  try {
    let player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      player = await prisma.player.create({ data: { id, name, health } });
    }
    return player;
  } catch (err) {
    console.error("Prisma error in findOrCreatePlayer:", err);
    throw err;
  }
}
