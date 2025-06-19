import { prisma } from "~/db/index.ts";
import type { Encounter } from "~/generated/prisma/client.ts";
import { rollAndAnnounceDie } from "../dice.ts";

export type PlayerTemplate = {
  create: (ctx: { random: () => number; channelId: bigint }) => {
    name: string;
    maxHealth: number;
    health: number;
    abilities: string[];
    act: (encounter: Encounter) => Promise<void>;
  };
};

export const basicPlayerTemplate: PlayerTemplate = {
  create: ({ random, channelId }) => ({
    name: "Basic Player",
    maxHealth: 10,
    health: 10,
    abilities: ["attack"],
    act: (encounter) => attackWeakestEnemy({ random, channelId, encounter }),
  }),
};

async function attackWeakestEnemy({
  random,
  channelId,
  encounter,
}: {
  random: () => number;
  channelId: bigint;
  encounter: Encounter;
}) {
  const weakestEnemy = await prisma.encounterEnemy.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      enemy: {
        health: "asc",
      },
    },
    include: {
      enemy: true,
    },
  });
  rollAndAnnounceDie({
    channelId,
    sides: 20,
    label: "attack",
    random,
  });
  if (weakestEnemy) {
    await prisma.encounterEnemy.update({
      where: { id: weakestEnemy.id },
      data: {
        enemy: {
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
