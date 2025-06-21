import { prisma } from "~/db/index.ts";

export async function getSeed(guildId: bigint) {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
  });
  return {
    seed: guild?.seed,
    randomCursor: guild?.randomCursor,
  };
}
