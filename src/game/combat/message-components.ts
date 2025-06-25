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
  };
}

export async function combatEmbedMessage({
  attackerName,
  targetName,
  attackSides,
  damageSides,
  ac,
  random,
  currentHealth,
  maxHealth,
  weaponName,
  avatarUrl,
}: {
  attackerName: string;
  targetName: string;
  attackSides: number;
  damageSides: number;
  ac: number;
  random: () => number;
  currentHealth?: number;
  maxHealth?: number;
  weaponName?: string | null;
  avatarUrl?: string;
}) {
  // Roll attack die
  const d20 = Math.floor(random() * attackSides) + 1;
  const diceImagePaths = [`media/dice/output/d${attackSides}_${d20}.png`];

  // Check if hit
  const hit = d20 >= ac;
  let damageRoll = 0;

  // Roll damage die if hit
  if (hit) {
    damageRoll = Math.floor(random() * damageSides) + 1;
    diceImagePaths.push(`media/dice/output/d${damageSides}_${damageRoll}.png`);
  }

  // Generate narration
  const narration = await combatNarration({
    attacker: attackerName,
    target: targetName,
    hit,
    damage: damageRoll,
    newHealth: currentHealth,
    maxHealth,
    weaponName,
  });

  let composedImage: Uint8Array;
  let fileName: string;

  if (hit && currentHealth !== undefined && maxHealth !== undefined) {
    // Only generate health bar if there's a hit and we have health data
    const healthBarImage = await getHealthBarImage({
      current: currentHealth,
      max: maxHealth,
      damage: damageRoll,
      label: targetName,
    });

    // Compose dice and health bar image
    composedImage = await composeDiceAndHealthbarImage({
      imagePaths: diceImagePaths,
      healthBarImage,
    });
    fileName = `combat_${d20}_${damageRoll}.png`;
  } else {
    // Just combine the dice images without health bar
    composedImage = await combineDiceImages({
      imagePaths: diceImagePaths,
    });
    fileName = `combat_${d20}.png`;
  }

  return {
    narration,
    hit,
    damageRoll,
    composedImage,
    fileName,
    avatarUrl,
  };
}
