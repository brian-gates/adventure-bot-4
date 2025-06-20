import { attackWeakestPlayer } from "../attack-weakest-player.ts";
import { EnemyTemplate } from "./index.ts";

export const orc = {
  name: "orc",
  baseHealth: 18,
  abilities: ["smash", "roar"],
  create: ({ random, channelId, guildId }) => {
    const bonus = Math.floor(random() * 5);
    return {
      name: "orc",
      maxHealth: 18 + bonus,
      health: 18 + bonus,
      abilities: ["smash", "roar"],
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
