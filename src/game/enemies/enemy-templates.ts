import { seededRandom } from "../seeded-random.ts";

export type EnemyFactoryContext = {
  seed: number;
  cursor: number;
  locationType: string;
  partySize: number;
  difficulty: number;
};

export type CombatState = {
  players: Array<{ id: string; health: number; maxHealth: number }>;
  enemies: EnemyInstance[];
  turn: number;
};

export type EnemyAction = {
  type: "attack" | "defend" | "useAbility" | "taunt";
  targetId?: string;
  ability?: string;
};

export type EnemyInstance = {
  name: string;
  maxHealth: number;
  health: number;
  abilities: string[];
  act: (combatState: CombatState, self: EnemyInstance) => EnemyAction;
};

export type EnemyTemplate = {
  name: string;
  baseHealth: number;
  abilities: string[];
  create: (ctx: EnemyFactoryContext) => EnemyInstance;
};

export const goblinTemplate: EnemyTemplate = {
  name: "goblin",
  baseHealth: 10,
  abilities: ["stab", "taunt"],
  create: (ctx) => {
    const rand = seededRandom(ctx.seed, ctx.cursor);
    const bonus = Math.floor(rand() * 3);
    return {
      name: "goblin",
      maxHealth: 10 + ctx.difficulty + bonus,
      health: 10 + ctx.difficulty + bonus,
      abilities: ["stab", "taunt"],
      act: (combatState, self) => {
        // Attack the player with the lowest health
        const target = combatState.players.reduce((
          a,
          b,
        ) => (a.health < b.health ? a : b));
        return { type: "attack", targetId: target.id };
      },
    };
  },
};

export const orcTemplate: EnemyTemplate = {
  name: "orc",
  baseHealth: 18,
  abilities: ["smash", "roar"],
  create: (ctx) => {
    const rand = seededRandom(ctx.seed + 1, ctx.cursor);
    const bonus = Math.floor(rand() * 5);
    return {
      name: "orc",
      maxHealth: 18 + ctx.difficulty * 2 + bonus,
      health: 18 + ctx.difficulty * 2 + bonus,
      abilities: ["smash", "roar"],
      act: (combatState, self) => {
        // Attack the player with the highest health
        const target = combatState.players.reduce((
          a,
          b,
        ) => (a.health > b.health ? a : b));
        return { type: "attack", targetId: target.id };
      },
    };
  },
};

export const slimeTemplate: EnemyTemplate = {
  name: "slime",
  baseHealth: 8,
  abilities: ["split", "ooze"],
  create: (ctx) => {
    const rand = seededRandom(ctx.seed + 2, ctx.cursor);
    const bonus = Math.floor(rand() * 2);
    return {
      name: "slime",
      maxHealth: 8 + Math.floor(ctx.difficulty / 2) + bonus,
      health: 8 + Math.floor(ctx.difficulty / 2) + bonus,
      abilities: ["split", "ooze"],
      act: (combatState, self) => {
        // Attack a random player
        const idx = Math.floor(rand() * combatState.players.length);
        const target = combatState.players[idx];
        return { type: "attack", targetId: target.id };
      },
    };
  },
};

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  goblinTemplate,
  orcTemplate,
  slimeTemplate,
];
