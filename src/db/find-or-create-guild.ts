import { prisma } from "./index.ts";

export async function findOrCreateGuild({ id }: { id: bigint }) {
  const guild = await prisma.guild.findUnique({ where: { id } });
  if (!guild) {
    await prisma.guild.create({ data: { id } });
  }
  const found = await prisma.guild.findUnique({ where: { id } });
  if (!found) {
    throw new Error(`No guild found for id: ${id}`);
  }
  return found;
}
