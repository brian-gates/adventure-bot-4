import { Encounter, Enemy, Player } from "../generated/prisma/client.ts";
import { enemyTemplatesByName } from "./enemies/templates/index.ts";
import { basicPlayerTemplate } from "./players/player-templates.ts";
import { seededRandom } from "./seeded-random.ts";

const random = seededRandom(1, 0);
const channelId = BigInt(0);
const guildId = BigInt(0);

const players = [
  basicPlayerTemplate.create({
    random,
    channelId,
    guildId,
  }),
  basicPlayerTemplate.create({
    random,
    channelId,
    guildId,
  }),
];

const goblinTemplate = enemyTemplatesByName.get("goblin")!;
const enemies = [
  goblinTemplate.create({ random, channelId, guildId }),
];

const mockPlayers: Player[] = [
  {
    id: BigInt(1),
    name: "Player 1",
    health: 10,
    maxHealth: 10,
    guildId: BigInt(1),
    createdAt: new Date(),
    updatedAt: new Date(),
    encounterId: "1",
    initiative: 15,
  },
  {
    id: BigInt(2),
    name: "Player 2",
    health: 10,
    maxHealth: 10,
    guildId: BigInt(1),
    createdAt: new Date(),
    updatedAt: new Date(),
    encounterId: "1",
    initiative: 12,
  },
];

const mockEnemies: Enemy[] = [
  {
    id: "enemy-1",
    name: "goblin",
    maxHealth: 10,
    health: 10,
    initiative: 10,
    encounterId: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const combatants = [
  ...players.map((p, i) => ({
    ...p,
    type: "player" as const,
    initiative: Math.floor(random() * 20),
    playerId: mockPlayers[i].id,
  })),
  ...enemies.map((e, i) => ({
    ...e,
    type: "enemy" as const,
    initiative: Math.floor(random() * 20),
    enemyId: mockEnemies[i].id,
  })),
];

combatants.sort((a, b) => b.initiative - a.initiative);

const encounter: Encounter = {
  id: "1",
  locationId: "test-location",
  createdAt: new Date(),
  updatedAt: new Date(),
  status: "active",
};

let round = 1;
while (players.some((p) => p.health > 0) && enemies.some((e) => e.health > 0)) {
  console.log(`--- Round ${round} ---`);
  for (const combatant of combatants) {
    if (combatant.health <= 0) continue;

    if (combatant.type === "player") {
      const playerInstance = mockPlayers.find((p) =>
        p.id === combatant.playerId
      );
      if (playerInstance) {
        await combatant.act({ encounter, player: playerInstance });
      }
    } else {
      const enemyInstance = mockEnemies.find((e) => e.id === combatant.enemyId);
      if (enemyInstance) {
        await combatant.act({ encounter, enemy: enemyInstance });
      }
    }
  }
  round++;
  if (round > 20) break; // prevent infinite loop
}

console.log("Combat ended.");
console.log("Players:", players);
console.log("Enemies:", enemies);
