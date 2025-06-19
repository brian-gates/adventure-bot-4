import { attackWeakestPlayer } from "../attack-weakest-player.ts";
import { EnemyTemplate } from "./index.ts";

export const goblin = {
  name: "goblin",
  baseHealth: 10,
  abilities: ["stab", "taunt"],
  create: ({ random, channelId }) => {
    const bonus = Math.floor(random() * 3);
    return {
      name: "goblin",
      maxHealth: 10 + bonus,
      health: 10 + bonus,
      abilities: ["stab", "taunt"],
      act: (encounter) =>
        attackWeakestPlayer({
          channelId,
          random,
          encounter,
        }),
    };
  },
} as const satisfies EnemyTemplate;
