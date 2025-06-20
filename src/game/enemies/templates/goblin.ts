import { attackWeakestPlayer } from "../attack-weakest-player.ts";
import { EnemyTemplate } from "./index.ts";
import { prisma } from "~/db/index.ts";

export const goblin = {
  name: "goblin",
  baseHealth: 10,
  abilities: ["stab", "taunt"],
  create: ({ random, channelId, guildId }) => {
    const bonus = Math.floor(random() * 3);
    return {
      name: "goblin",
      maxHealth: 10 + bonus,
      health: 10 + bonus,
      abilities: ["stab", "taunt"],
      act: async (encounter) => {
        const encounterEnemy = await prisma.encounterEnemy.findFirst({
          where: { encounterId: encounter.id },
          include: { enemy: true },
        });

        if (encounterEnemy) {
          await attackWeakestPlayer({
            channelId,
            guildId,
            random,
            encounter,
            attacker: encounterEnemy.enemy,
          });
        }
      },
    };
  },
} as const satisfies EnemyTemplate;
