import { prisma } from "~/db/index.ts";
import { weightedRandom } from "~/game/weighted-random.ts";
import {
  type GearTemplate,
  gearTemplates,
  rarityWeights,
} from "./gear-templates.ts";
import type { Enemy, Player } from "~/generated/prisma/client.ts";
import type { Rarity } from "~/generated/prisma/enums.ts";

export interface LootReward {
  experience: number;
  gold: number;
  gearOptions?: GearTemplate[];
}

export interface EnemyLootTable {
  baseExperience: number;
  baseGold: number;
  gearDropChance: number;
  maxGearLevel: number;
}

const enemyLootTables: Record<string, EnemyLootTable> = {
  goblin: {
    baseExperience: 10,
    baseGold: 5,
    gearDropChance: 1.0,
    maxGearLevel: 2,
  },
  orc: {
    baseExperience: 25,
    baseGold: 15,
    gearDropChance: 1.0,
    maxGearLevel: 3,
  },
  slime: {
    baseExperience: 8,
    baseGold: 3,
    gearDropChance: 1.0,
    maxGearLevel: 1,
  },
};

function calculateExperienceAndGold({
  enemy,
  random,
}: {
  enemy: Enemy;
  random: () => number;
}): { experience: number; gold: number } {
  const lootTable = enemyLootTables[enemy.name] || enemyLootTables.goblin;

  const experienceVariation = 0.2;
  const goldVariation = 0.3;

  const experience = Math.max(
    1,
    Math.floor(
      lootTable.baseExperience * (1 + (random() - 0.5) * experienceVariation),
    ),
  );

  const gold = Math.max(
    0,
    Math.floor(
      lootTable.baseGold * (1 + (random() - 0.5) * goldVariation),
    ),
  );

  return { experience, gold };
}

function getAvailableGear({
  enemy,
  playerLevel,
}: {
  enemy: Enemy;
  playerLevel: number;
}): GearTemplate[] {
  const lootTable = enemyLootTables[enemy.name] || enemyLootTables.goblin;

  return gearTemplates.filter((gear) =>
    gear.level <= Math.min(lootTable.maxGearLevel, playerLevel + 1)
  );
}

function calculateGearWeight({
  gear,
  playerLevel,
}: {
  gear: GearTemplate;
  playerLevel: number;
}): number {
  const rarityWeight = rarityWeights[gear.rarity as keyof typeof rarityWeights];
  const levelBonus = Math.max(0, playerLevel - gear.level + 1);
  return rarityWeight * (1 + levelBonus * 0.1);
}

function generateGearOptions({
  availableGear,
  playerLevel,
  random,
}: {
  availableGear: GearTemplate[];
  playerLevel: number;
  random: () => number;
}): GearTemplate[] {
  const gearOptions: GearTemplate[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < 3 && availableGear.length > 0; i++) {
    const gearWeights: Record<number, number> = {};

    availableGear.forEach((gear, index) => {
      if (!usedIndices.has(index)) {
        gearWeights[index] = calculateGearWeight({ gear, playerLevel });
      }
    });

    if (Object.keys(gearWeights).length > 0) {
      const selectedGearIndex = Number(weightedRandom(gearWeights, random));
      gearOptions.push(availableGear[selectedGearIndex]);
      usedIndices.add(selectedGearIndex);
    }
  }

  return gearOptions;
}

export function generateLoot({
  enemy,
  playerLevel,
  random,
}: {
  enemy: Enemy;
  playerLevel: number;
  random: () => number;
}): LootReward {
  const { experience, gold } = calculateExperienceAndGold({ enemy, random });
  const lootTable = enemyLootTables[enemy.name] || enemyLootTables.goblin;

  const reward: LootReward = { experience, gold };

  if (random() < lootTable.gearDropChance) {
    const availableGear = getAvailableGear({ enemy, playerLevel });

    if (availableGear.length > 0) {
      reward.gearOptions = generateGearOptions({
        availableGear,
        playerLevel,
        random,
      });
    }
  }

  return reward;
}

function calculateNewLevel(experience: number): number {
  return Math.floor(experience / 100) + 1;
}

function createPlayerUpdateData({
  player,
  reward,
}: {
  player: Player;
  reward: LootReward;
}): Record<string, unknown> {
  const newExperience = (player.experience ?? 0) + reward.experience;
  const newLevel = calculateNewLevel(newExperience);
  const levelUp = newLevel > (player.level ?? 1);

  const updateData: Record<string, unknown> = {
    experience: newExperience,
    gold: (player.gold ?? 0) + reward.gold,
    level: newLevel,
  };

  if (levelUp) {
    updateData.maxHealth = (player.maxHealth ?? 10) + 2;
    updateData.health = Math.min(
      (player.health ?? 10) + 2,
      (player.maxHealth ?? 10) + 2,
    );
  }

  return updateData;
}

async function findOrCreateGear(selectedGear: GearTemplate) {
  let gear = await prisma.gear.findFirst({
    where: {
      name: selectedGear.name,
      type: selectedGear.type,
      rarity: selectedGear.rarity,
      level: selectedGear.level,
    },
  });

  if (!gear) {
    gear = await prisma.gear.create({
      data: {
        name: selectedGear.name,
        description: selectedGear.description,
        type: selectedGear.type,
        rarity: selectedGear.rarity,
        level: selectedGear.level,
        attack: selectedGear.attack,
        defense: selectedGear.defense,
        health: selectedGear.health,
        value: selectedGear.value,
      },
    });
  }

  return gear;
}

export async function grantRewards({
  playerId,
  reward,
  selectedGearIndex,
}: {
  playerId: bigint;
  reward: LootReward;
  selectedGearIndex?: number;
}) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) return;

  const updateData = createPlayerUpdateData({ player, reward });
  await prisma.player.update({
    where: { id: playerId },
    data: updateData,
  });

  if (
    reward.gearOptions && selectedGearIndex !== undefined &&
    selectedGearIndex >= 0 && selectedGearIndex < reward.gearOptions.length
  ) {
    const selectedGear = reward.gearOptions[selectedGearIndex];
    const gear = await findOrCreateGear(selectedGear);

    await prisma.playerInventory.create({
      data: {
        playerId,
        gearId: gear.id,
        equipped: false,
      },
    });
  }

  const newLevel = calculateNewLevel(updateData.experience as number);
  const levelUp = newLevel > (player.level ?? 1);

  return {
    levelUp,
    newLevel,
    gearAcquired: reward.gearOptions && selectedGearIndex !== undefined &&
      selectedGearIndex >= 0,
  };
}

function getRarityEmoji(rarity: Rarity): string {
  const rarityEmoji: Record<Rarity, string> = {
    common: "⚪",
    uncommon: "🟢",
    rare: "🔵",
    epic: "🟣",
    legendary: "🟡",
  };
  return rarityEmoji[rarity];
}

function formatGearStats(gear: GearTemplate): string {
  const stats = [];
  if (gear.attack > 0) stats.push(`Attack: +${gear.attack}`);
  if (gear.defense > 0) stats.push(`Defense: +${gear.defense}`);
  if (gear.health > 0) stats.push(`Health: +${gear.health}`);
  return stats.join(" | ");
}

function formatGearOption(gear: GearTemplate, index: number): string {
  const emoji = getRarityEmoji(gear.rarity as Rarity);
  let message = `${index + 1}. ${emoji} **${gear.name}** (${gear.rarity})\n`;
  message += `   ${gear.description}\n`;

  const stats = formatGearStats(gear);
  if (stats) {
    message += `   ${stats}\n`;
  }
  message += "\n";

  return message;
}

export function formatRewardMessage({
  playerName,
  reward,
  levelUp,
  newLevel,
}: {
  playerName: string;
  reward: LootReward;
  levelUp: boolean;
  newLevel: number;
}): string {
  let message = `**${playerName}** received:\n`;
  message += `• ${reward.experience} experience points\n`;
  message += `• ${reward.gold} gold\n`;

  if (reward.gearOptions && reward.gearOptions.length > 0) {
    message += `\n**Choose your loot:**\n`;
    reward.gearOptions.forEach((gear, index) => {
      message += formatGearOption(gear, index);
    });
    message += `Click the button below to choose your loot!`;
  }

  if (levelUp) {
    message += `\n🎉 **LEVEL UP!** ${playerName} is now level ${newLevel}!`;
  }

  return message;
}

export function formatGearChoiceMessage({
  playerName,
  selectedGear,
}: {
  playerName: string;
  selectedGear: GearTemplate;
}): string {
  const emoji = getRarityEmoji(selectedGear.rarity as Rarity);

  let message =
    `**${playerName}** chose: ${emoji} **${selectedGear.name}** (${selectedGear.rarity})\n`;
  message += `${selectedGear.description}\n`;

  const stats = formatGearStats(selectedGear);
  if (stats) {
    message += stats;
  }

  return message;
}
