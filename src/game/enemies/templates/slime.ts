import { attackWeakestPlayer } from "../attack-weakest-player.ts";
import { EnemyTemplate } from "./index.ts";

export const slime = {
  name: "slime",
  baseHealth: 8,
  abilities: ["split", "ooze"],
  create: ({ random, channelId, guildId }) => {
    const bonus = Math.floor(random() * 2);
    return {
      name: "slime",
      maxHealth: 8 + bonus,
      health: 8 + bonus,
      abilities: ["split", "ooze"],
      act: async (encounter) => {
        // Get the enemy instance for this encounter
        const { prisma } = await import("~/db/index.ts");
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
