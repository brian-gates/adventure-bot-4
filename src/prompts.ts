export const immersiveRoleplay =
  "Express effects in roleplay terms—avoid mentioning mechanics like health points overtly. Keep it flavorful and immersive.";

export const defaultResponseTemplate = [
  "Respond ONLY with a single vivid, immersive sentence.",
  "Do not include any JSON or extra formatting.",
];

export function mentionInstruction({
  role,
  userId,
}: {
  role: string;
  userId: bigint;
}) {
  return `Always refer to the ${role} using the exact mention string <@${userId}> so Discord renders it as a clickable mention.`;
}

export function narrateAttack({
  attackerId,
  target,
  d20,
  damage,
  newHealth,
}: {
  attackerId: bigint;
  target: string;
  d20: number;
  damage: number;
  newHealth?: number;
}) {
  return [
    `Narrate an attack in a fantasy Discord RPG.`,
    `The attacker is <@${attackerId}> (use this exact mention format for the attacker).`,
    `The target is ${target}.`,
    `The d20 roll was ${d20} against AC 10.`,
    `The damage roll was ${damage} (1d4 unarmed).`,
    newHealth !== undefined
      ? `The target's new health is ${newHealth}.`
      : `The target's health is unknown.`,
    ...defaultResponseTemplate,
    mentionInstruction({ role: "attacker", userId: attackerId }),
    immersiveRoleplay,
  ].join(" ");
}

export function narrateHeal({
  healerId,
  targetId,
  healAmount,
  newHealth,
  maxHealth,
}: {
  healerId: bigint;
  targetId: bigint;
  healAmount: number;
  newHealth: number;
  maxHealth: number;
}) {
  const healPercentage = Math.round((healAmount / maxHealth) * 100);

  return [
    `Narrate a magical or fantasy healing in a Discord RPG.`,
    `The target was healed for about ${healPercentage}% of their total life force, bringing them to ${newHealth} health.`,
    `Do not mention the words "percentage", "percent", or the "%" symbol. Instead, use descriptive language to convey the amount of healing. For example, instead of "25%", you could say "a quarter of their vitality", "a sliver of their life force", or "a significant portion of their health".`,
    `Do not mention the raw health numbers.`,
    ...defaultResponseTemplate,
    mentionInstruction({ role: "healer", userId: healerId }),
    mentionInstruction({ role: "target", userId: targetId }),
    immersiveRoleplay,
  ].join(" ");
}
