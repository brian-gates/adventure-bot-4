export const immersiveRoleplay =
  "Express effects in roleplay terms—avoid mentioning mechanics like health points overtly. Keep it flavorful and immersive.";

export const defaultResponseTemplate = [
  "Respond with a single, concise sentence.",
  "Do not include any JSON or extra formatting.",
];

export function mentionInstruction({
  role,
  userId,
}: {
  role: string;
  userId: bigint;
}) {
  return `IMPORTANT: Always refer to the ${role} using the exact Discord mention format <@${userId}> so Discord renders it as a clickable mention. Do not use raw user IDs like ${userId}.`;
}

export function narrateAttack({
  attacker,
  target,
  hit,
  damage,
  d20,
  attackerId,
  targetId,
  newHealth,
  maxHealth,
  weaponName,
}: {
  attacker: string;
  target: string;
  hit: boolean;
  damage?: number;
  d20?: number;
  attackerId?: bigint;
  targetId?: bigint;
  newHealth?: number;
  maxHealth?: number;
  weaponName?: string | null;
}) {
  const healthPercentage = newHealth && maxHealth
    ? Math.round((newHealth / maxHealth) * 100)
    : undefined;

  const attackDescription = d20 !== undefined
    ? `Roll: ${d20} vs AC 10. Damage: ${damage}.`
    : hit
    ? `Hit for ${damage} damage.`
    : `Miss.`;

  const healthInfo = healthPercentage !== undefined
    ? `Target at ${healthPercentage}% health.`
    : ``;

  const weaponInfo = weaponName
    ? `Attacker is using: ${weaponName}.`
    : `Attacker is unarmed.`;

  const mentionInstructions = [
    attackerId && mentionInstruction({ role: "attacker", userId: attackerId }),
    targetId && mentionInstruction({ role: "target", userId: targetId }),
  ].filter(Boolean).join(" ");

  return [
    `Narrate a brief attack in a fantasy RPG. Keep it readible within a second or two, as it will be in a fast moving loop. Keep it concise and to the point but with a bit of flavor.`,
    `Attacker: ${attackerId ? `<@${attackerId}>` : attacker}. Target: ${
      targetId ? `<@${targetId}>` : target
    }.`,
    `Be concise and pithy - avoid verbose descriptions. Focus on the key action.`,
    weaponInfo,
    attackDescription,
    healthInfo,
    `Do not mention raw numbers.`,
    ...defaultResponseTemplate,
    mentionInstructions,
    immersiveRoleplay,
  ].join(" ");
}

export function narrateHeal({
  healerId,
  targetId,
  healAmount,
  maxHealth,
}: {
  healerId: bigint;
  targetId: bigint;
  healAmount: number;
  maxHealth: number;
}) {
  const healPercentage = Math.round((healAmount / maxHealth) * 100);

  return [
    `Narrate a brief healing in a fantasy RPG. Keep it under 120 characters.`,
    `Healer: <@${healerId}>. Target: <@${targetId}>.`,
    `Healed for ${healPercentage}% of max health.`,
    `Be concise and pithy - avoid verbose descriptions. Focus on the key action.`,
    `Do not mention raw health numbers or percentages, keep the description narrative.`,
    ...defaultResponseTemplate,
    mentionInstruction({ role: "healer", userId: healerId }),
    mentionInstruction({ role: "target", userId: targetId }),
    immersiveRoleplay,
  ].join(" ");
}

export function narrateEncounter({
  enemyType,
  playerIds,
}: {
  enemyType: string;
  playerIds: bigint[];
}) {
  const playerMentions = playerIds.map((id) => `<@${id}>`).join(", ");

  return [
    `Briefly describe a ${enemyType} appearing before ${playerMentions}.`,
    `Keep it very brief but atmospheric.`,
    ...defaultResponseTemplate,
    immersiveRoleplay,
  ].join(" ");
}

// Deprecated: Use narrateAttack instead
export function narrateCombatAction({
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
  return narrateAttack({
    attacker,
    target,
    hit,
    damage,
    newHealth,
    maxHealth,
    weaponName,
  });
}
