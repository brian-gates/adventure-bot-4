import { combineDiceImages, rollAttackWithMessage } from "../dice.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";
import { narrate } from "~/llm/index.ts";
import { narrateCombatAction } from "~/prompts.ts";
import { composeDiceAndHealthbarImage } from "../dice.ts";

export async function attackMessage({
  attackSides,
  damageSides,
  attackLabel,
  damageLabel,
  ac,
  random,
}: {
  attackSides: number;
  damageSides: number;
  attackLabel: string;
  damageLabel: string;
  ac: number;
  random: () => number;
}) {
  const result = await rollAttackWithMessage({
    attackSides,
    damageSides,
    attackLabel,
    damageLabel,
    ac,
    random,
  });
  return {
    message: result.message,
    hit: result.hit,
    damageRoll: result.damageRoll,
  };
}

export async function combatNarration({
  attacker,
  target,
  hit,
  damage,
  newHealth,
  maxHealth,
  weaponName,
}: {
  attacker: string;
  target: string;
  hit: boolean;
  damage?: number;
  newHealth?: number;
  maxHealth?: number;
  weaponName?: string | null;
}) {
  const prompt = narrateCombatAction({
    attacker,
    target,
    hit,
    damage,
    newHealth,
    maxHealth,
    weaponName,
  });
  return await narrate({ prompt });
}

export async function healthBarImage({
  currentHealth,
  maxHealth,
  healAmount = 0,
  damageAmount = 0,
  label,
}: {
  currentHealth: number;
  maxHealth: number;
  healAmount?: number;
  damageAmount?: number;
  label?: string;
}) {
  return await getHealthBarImage({
    current: currentHealth,
    max: maxHealth,
    heal: healAmount,
    damage: damageAmount,
    label,
  });
}

export async function combatMessage({
  attackerName,
  targetName,
  attackSides,
  damageSides,
  attackLabel,
  damageLabel,
  ac,
  random,
  includeHealthBar = false,
  currentHealth,
  maxHealth,
  weaponName,
}: {
  attackerName: string;
  targetName: string;
  attackSides: number;
  damageSides: number;
  attackLabel: string;
  damageLabel: string;
  ac: number;
  random: () => number;
  includeHealthBar?: boolean;
  currentHealth?: number;
  maxHealth?: number;
  weaponName?: string | null;
}) {
  const attackResult = await attackMessage({
    attackSides,
    damageSides,
    attackLabel,
    damageLabel,
    ac,
    random,
  });

  console.log("[combatMessage] Calling combatNarration...");
  const narration = await combatNarration({
    attacker: attackerName,
    target: targetName,
    hit: attackResult.hit,
    damage: attackResult.damageRoll,
    newHealth: currentHealth,
    maxHealth,
    weaponName,
  });
  console.log("[combatMessage] combatNarration returned.");

  // Add a clear action line at the beginning
  const actionLine = `**${attackerName} attacks ${targetName}**`;
  const message = `${actionLine}\n\n${attackResult.message}\n\n${narration}`;

  let healthBarData: Uint8Array | undefined;
  if (
    includeHealthBar && currentHealth !== undefined && maxHealth !== undefined
  ) {
    healthBarData = await getHealthBarImage({
      current: currentHealth,
      max: maxHealth,
      damage: attackResult.hit ? attackResult.damageRoll : 0,
      label: targetName,
    });
  }

  return {
    message,
    hit: attackResult.hit,
    damageRoll: attackResult.damageRoll,
    healthBarImage: healthBarData,
    d20: undefined,
    composedImage: undefined,
    fileName: undefined,
    avatarUrl: undefined,
  };
}

export function resolveCombatAction({
  attackBonus,
  damageDice,
  ac,
  random,
  targetHealth,
}: {
  attackBonus: number;
  damageDice: string;
  ac: number;
  random: () => number;
  targetHealth: number;
}) {
  const d20 = Math.floor(random() * 20) + 1;
  const totalAttack = d20 + attackBonus;
  const hit = totalAttack >= ac;
  let damageRoll = 0;
  if (hit) {
    const damageSides = parseInt(damageDice.substring(1));
    damageRoll = Math.floor(random() * damageSides) + 1;
  }
  const newHealth = Math.max(0, targetHealth - damageRoll);
  return {
    d20,
    hit,
    damageRoll,
    critical: d20 === 20,
    defeated: hit && newHealth === 0,
    newHealth,
  };
}
