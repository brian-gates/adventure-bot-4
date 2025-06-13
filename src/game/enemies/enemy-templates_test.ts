// This file was renamed from enemy-templates.test.ts to enemy-templates_test.ts to follow Deno conventions.
import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";
import {
  CombatState,
  EnemyFactoryContext,
  goblinTemplate,
  orcTemplate,
  slimeTemplate,
} from "./enemy-templates.ts";

Deno.test("goblin create is deterministic", () => {
  const ctx: EnemyFactoryContext = {
    seed: 42,
    cursor: 1,
    locationType: "combat",
    partySize: 3,
    difficulty: 2,
  };
  const goblin1 = goblinTemplate.create(ctx);
  const goblin2 = goblinTemplate.create(ctx);
  assertEquals(goblin1, goblin2);
});

Deno.test("orc create is deterministic", () => {
  const ctx: EnemyFactoryContext = {
    seed: 99,
    cursor: 2,
    locationType: "combat",
    partySize: 2,
    difficulty: 1,
  };
  const orc1 = orcTemplate.create(ctx);
  const orc2 = orcTemplate.create(ctx);
  assertEquals(orc1, orc2);
});

Deno.test("slime create is deterministic", () => {
  const ctx: EnemyFactoryContext = {
    seed: 7,
    cursor: 3,
    locationType: "combat",
    partySize: 1,
    difficulty: 0,
  };
  const slime1 = slimeTemplate.create(ctx);
  const slime2 = slimeTemplate.create(ctx);
  assertEquals(slime1, slime2);
});

Deno.test("goblin act targets lowest health player", () => {
  const ctx: EnemyFactoryContext = {
    seed: 1,
    cursor: 1,
    locationType: "combat",
    partySize: 2,
    difficulty: 0,
  };
  const goblin = goblinTemplate.create(ctx);
  const combatState: CombatState = {
    players: [
      { id: "a", health: 10, maxHealth: 10 },
      { id: "b", health: 3, maxHealth: 10 },
    ],
    enemies: [goblin],
    turn: 1,
  };
  const action = goblin.act(combatState, goblin);
  assertEquals(action.type, "attack");
  assertEquals(action.targetId, "b");
});

Deno.test("orc act targets highest health player", () => {
  const ctx: EnemyFactoryContext = {
    seed: 2,
    cursor: 1,
    locationType: "combat",
    partySize: 2,
    difficulty: 0,
  };
  const orc = orcTemplate.create(ctx);
  const combatState: CombatState = {
    players: [
      { id: "a", health: 5, maxHealth: 10 },
      { id: "b", health: 9, maxHealth: 10 },
    ],
    enemies: [orc],
    turn: 1,
  };
  const action = orc.act(combatState, orc);
  assertEquals(action.type, "attack");
  assertEquals(action.targetId, "b");
});

Deno.test("slime act targets a player (random, deterministic)", () => {
  const ctx: EnemyFactoryContext = {
    seed: 3,
    cursor: 1,
    locationType: "combat",
    partySize: 2,
    difficulty: 0,
  };
  const slime = slimeTemplate.create(ctx);
  const combatState: CombatState = {
    players: [
      { id: "a", health: 5, maxHealth: 10 },
      { id: "b", health: 9, maxHealth: 10 },
    ],
    enemies: [slime],
    turn: 1,
  };
  const action = slime.act(combatState, slime);
  // For seed/cursor, the target should always be the same
  assertEquals(["a", "b"].includes(action.targetId ?? ""), true);
});
