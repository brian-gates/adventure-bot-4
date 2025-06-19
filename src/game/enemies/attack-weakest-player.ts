import { prisma } from "../../db/index.ts";
import type { Encounter } from "../../generated/prisma/client.ts";
import { rollAndAnnounceDie } from "../dice.ts";

export async function attackWeakestPlayer({
  random,
  channelId,
  encounter,
}: {
  channelId: bigint;
  random: () => number;
  encounter: Encounter;
}) {
  const weakestPlayer = await prisma.encounterPlayer.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      player: {
        health: "asc",
      },
    },
    include: {
      player: true,
    },
  });
  rollAndAnnounceDie({
    channelId,
    sides: 20,
    label: "attack",
    random,
  });
  if (weakestPlayer) {
    await prisma.encounterPlayer.update({
      where: { id: weakestPlayer.id },
      data: {
        player: {
          update: {
            health: {
              decrement: 1,
            },
          },
        },
      },
    });
  }
}
