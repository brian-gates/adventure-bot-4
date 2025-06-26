import type { DamageDice, GearType, Rarity } from "~/generated/prisma/enums.ts";

export interface GearTemplate {
  name: string;
  description: string;
  type: GearType;
  rarity: Rarity;
  level: number;
  attack: number;
  damageDice: DamageDice;
  defense: number;
  health: number;
  value: number;
  weight: number;
}

export const gearTemplates: GearTemplate[] = [
  {
    name: "Rusty Dagger",
    description: "A dull but serviceable blade",
    type: "weapon",
    rarity: "common",
    level: 1,
    attack: 0,
    damageDice: "d4",
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
    attack: 0,
    damageDice: "d6",
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
    attack: 0,
    damageDice: "d6",
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
    damageDice: "none",
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
    damageDice: "none",
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
    damageDice: "none",
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
    attack: 0,
    damageDice: "d6",
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
    attack: 0,
    damageDice: "d8",
    defense: 0,
    health: 0,
    value: 30,
    weight: 6,
  },
  {
    name: "Short Sword",
    description: "A quick and agile blade",
    type: "weapon",
    rarity: "uncommon",
    level: 2,
    attack: 0,
    damageDice: "d6",
    defense: 0,
    health: 0,
    value: 28,
    weight: 7,
  },
  {
    name: "Longsword",
    description: "A balanced and versatile weapon",
    type: "weapon",
    rarity: "uncommon",
    level: 2,
    attack: 0,
    damageDice: "d8",
    defense: 0,
    health: 0,
    value: 35,
    weight: 5,
  },

  // Uncommon Armor
  {
    name: "Chain Mail",
    description: "Flexible metal armor",
    type: "armor",
    rarity: "uncommon",
    level: 2,
    attack: 0,
    damageDice: "none",
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
    attack: 2,
    damageDice: "d8",
    defense: 0,
    health: 2,
    value: 75,
    weight: 3,
  },
  {
    name: "Greatsword",
    description: "A massive two-handed blade",
    type: "weapon",
    rarity: "rare",
    level: 3,
    attack: 0,
    damageDice: "d10",
    defense: 0,
    health: 0,
    value: 80,
    weight: 2,
  },

  // Rare Armor
  {
    name: "Mystic Robes",
    description: "Robes woven with protective enchantments",
    type: "armor",
    rarity: "rare",
    level: 3,
    attack: 0,
    damageDice: "none",
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
    attack: 3,
    damageDice: "d10",
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
    attack: 5,
    damageDice: "d12",
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
