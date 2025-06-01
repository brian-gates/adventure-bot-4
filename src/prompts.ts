export const immersiveRoleplay =
  "Express effects in roleplay terms—avoid mentioning mechanics like health points overtly. Keep it flavorful and immersive.";

export const defaultResponseTemplate = [
  "Respond ONLY with a single vivid, immersive sentence.",
  "Do not include any JSON or extra formatting.",
];

export function mentionInstruction({
  role,
  authorId,
}: {
  role: string;
  authorId: string | number;
}) {
  return `Always refer to the ${role} using the exact mention string <@${authorId}> so Discord renders it as a clickable mention.`;
}

export function narrateAttack({
  authorId,
  target,
  d20,
  damage,
  newHealth,
}: {
  authorId: string | number;
  target: string;
  d20: number;
  damage: number;
  newHealth?: number;
}) {
  return [
    `Narrate an attack in a fantasy Discord RPG.`,
    `The attacker is <@${authorId}> (use this exact mention format for the attacker).`,
    `The target is ${target}.`,
    `The d20 roll was ${d20} against AC 10.`,
    `The damage roll was ${damage} (1d4 unarmed).`,
    newHealth !== undefined
      ? `The target's new health is ${newHealth}.`
      : `The target's health is unknown.`,
    ...defaultResponseTemplate,
    mentionInstruction({ role: "attacker", authorId }),
    immersiveRoleplay,
  ].join(" ");
}

export function narrateHeal({
  authorId,
  targetId,
  healAmount,
  newHealth,
}: {
  authorId: string | number;
  targetId: string | number;
  healAmount: number;
  newHealth: number;
}) {
  return [
    `Narrate a magical or fantasy healing in a Discord RPG.`,
    `The healer is <@${authorId}> (use this exact mention format for the healer).`,
    `The target is <@${targetId}>.`,
    `The amount healed is ${healAmount}.`,
    `The target's new health is ${newHealth}.`,
    ...defaultResponseTemplate,
    mentionInstruction({ role: "healer", authorId }),
    immersiveRoleplay,
  ].join(" ");
}
