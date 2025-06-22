import type { GearType, Rarity } from "~/generated/prisma/enums.ts";

export interface GearTemplate {
  name: string;
  description: string;
  type: GearType;
  rarity: Rarity;
  level: number;
  attack: number;
  defense: number;
  health: number;
  value: number;
  weight: number; // For loot generation probability
}

export const gearTemplates: GearTemplate[] = [
  // Common Weapons
  {
    name: "Rusty Dagger",
    description: "A dull but serviceable blade",
    type: "weapon",
    rarity: "common",
    level: 1,
    attack: 2,
    defense: 0,
    health: 0,
    value: 5,
    weight: 15,
  },
  {
    name: "Wooden Club",
    description: "A simple wooden weapon",
    type: "weapon",
    rarity: "common",
    level: 1,
    attack: 3,
    defense: 0,
    health: 0,
    value: 3,
    weight: 20,
  },
  {
    name: "Stone Axe",
    description: "A crude but effective weapon",
    type: "weapon",
    rarity: "common",
    level: 1,
    attack: 4,
    defense: 0,
    health: 0,
    value: 8,
    weight: 12,
  },

  // Common Armor
  {
    name: "Leather Vest",
    description: "Basic leather protection",
    type: "armor",
    rarity: "common",
    level: 1,
    attack: 0,
    defense: 2,
    health: 0,
    value: 10,
    weight: 18,
  },
  {
    name: "Cloth Robes",
    description: "Simple magical robes",
    type: "armor",
    rarity: "common",
    level: 1,
    attack: 0,
    defense: 1,
    health: 2,
    value: 8,
    weight: 15,
  },

  // Common Accessories
  {
    name: "Copper Ring",
    description: "A simple ring with minor magical properties",
    type: "accessory",
    rarity: "common",
    level: 1,
    attack: 1,
    defense: 0,
    health: 1,
    value: 12,
    weight: 10,
  },

  // Uncommon Weapons
  {
    name: "Iron Sword",
    description: "A well-crafted iron blade",
    type: "weapon",
    rarity: "uncommon",
    level: 2,
    attack: 6,
    defense: 0,
    health: 0,
    value: 25,
    weight: 8,
  },
  {
    name: "Steel Mace",
    description: "A heavy but powerful weapon",
    type: "weapon",
    rarity: "uncommon",
    level: 2,
    attack: 7,
    defense: 0,
    health: 0,
    value: 30,
    weight: 6,
  },

  // Uncommon Armor
  {
    name: "Chain Mail",
    description: "Flexible metal armor",
    type: "armor",
    rarity: "uncommon",
    level: 2,
    attack: 0,
    defense: 4,
    health: 0,
    value: 35,
    weight: 5,
  },

  // Rare Weapons
  {
    name: "Enchanted Blade",
    description: "A sword that glows with magical energy",
    type: "weapon",
    rarity: "rare",
    level: 3,
    attack: 10,
    defense: 0,
    health: 2,
    value: 75,
    weight: 3,
  },

  // Rare Armor
  {
    name: "Mystic Robes",
    description: "Robes woven with protective enchantments",
    type: "armor",
    rarity: "rare",
    level: 3,
    attack: 0,
    defense: 3,
    health: 5,
    value: 80,
    weight: 2,
  },

  // Epic Weapons
  {
    name: "Dragonbone Sword",
    description: "Forged from the bones of a mighty dragon",
    type: "weapon",
    rarity: "epic",
    level: 5,
    attack: 15,
    defense: 2,
    health: 3,
    value: 200,
    weight: 1,
  },

  // Legendary Weapons
  {
    name: "Sword of the Ancients",
    description: "A legendary blade of immense power",
    type: "weapon",
    rarity: "legendary",
    level: 10,
    attack: 25,
    defense: 5,
    health: 10,
    value: 500,
    weight: 1,
  },
];

export const rarityWeights = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1,
} as const;
