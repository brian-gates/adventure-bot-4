import { attackWeakestPlayer } from "../attack-weakest-player.ts";
import { EnemyTemplate } from "./index.ts";

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
