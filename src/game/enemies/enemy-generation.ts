import { weightedRandom } from "~/game/weighted-random.ts";

const enemyWeights = {
  goblin: 5,
  orc: 2,
  slime: 3,
};
type EnemyName = keyof typeof enemyWeights;

const enemyStats: Record<EnemyName, { maxHealth: number }> = {
  goblin: { maxHealth: 10 },
  orc: { maxHealth: 18 },
  slime: { maxHealth: 8 },
};

export function generateEnemyData(random: () => number) {
  const enemyType = weightedRandom(enemyWeights, random);
  const stats = enemyStats[enemyType];
  const enemiesToSpawn = 1;
  const enemyData = Array.from({ length: enemiesToSpawn }).map(() => ({
    name: enemyType,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    initiative: Math.floor(random() * 20),
  }));

  return { enemyData, enemyType };
}
