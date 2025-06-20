import { Encounter } from "../generated/prisma/client.ts";
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

const combatants = [
  ...players.map((p, _i) => ({
    ...p,
    type: "player",
    initiative: Math.floor(random() * 20),
  })),
  ...enemies.map((e, _i) => ({
    ...e,
    type: "enemy",
    initiative: Math.floor(random() * 20),
  })),
];

combatants.sort((a, b) => b.initiative - a.initiative);

const encounter: Encounter = {
  id: "1",
  createdAt: new Date(),
  updatedAt: new Date(),
  status: "active",
};

let round = 1;
while (players.some((p) => p.health > 0) && enemies.some((e) => e.health > 0)) {
  console.log(`--- Round ${round} ---`);
  for (const combatant of combatants) {
    if (combatant.health <= 0) continue;
    await combatant.act(encounter);
  }
  round++;
  if (round > 20) break; // prevent infinite loop
}

console.log("Combat ended.");
console.log("Players:", players);
console.log("Enemies:", enemies);
