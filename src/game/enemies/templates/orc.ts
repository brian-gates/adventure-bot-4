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
      act: async ({ encounter, enemy }) => {
        await attackWeakestPlayer({
          channelId,
          guildId,
          random,
          encounter,
          attacker: enemy,
        });
      },
    };
  },
} as const satisfies EnemyTemplate;
