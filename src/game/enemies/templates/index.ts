import type { Encounter } from "../../../generated/prisma/client.ts";
import { goblin } from "./goblin.ts";
import { orc } from "./orc.ts";
import { slime } from "./slime.ts";

export type EnemyTemplate = {
  name: string;
  baseHealth: number;
  abilities: readonly string[];
  create: (
    ctx: { random: () => number; channelId: bigint; guildId: bigint },
  ) => {
    name: string;
    maxHealth: number;
    health: number;
    abilities: readonly string[];
    act: (encounter: Encounter) => Promise<void>;
  };
};

export const allEnemyTemplates = [
  goblin,
  orc,
  slime,
] as const satisfies EnemyTemplate[];

export const enemyTemplatesByName = new Map(
  allEnemyTemplates.map((t) => [t.name, t]),
);

export function isEnemyTemplateKey(
  name: string,
): name is (typeof allEnemyTemplates)[number]["name"] {
  return allEnemyTemplates.some((t) => t.name === name);
}
