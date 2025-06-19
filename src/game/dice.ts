import { bot } from "~/bot/index.ts";

export function rollDie({
  sides,
  random,
}: {
  sides: number;
  random: () => number;
}) {
  return Math.floor(random() * sides) + 1;
}

async function getRollEmoji(
  { guildId, sides, roll }: {
    guildId: bigint | undefined;
    sides: number;
    roll: number;
  },
): Promise<string> {
  if (!guildId || (sides !== 20 && sides !== 4)) return "";
  const num = roll.toString().padStart(2, "0");
  const name = sides === 20 ? `d20_${num}` : `d4_${roll}`;
  const emojis = await bot.helpers.getEmojis(guildId);
  const found = emojis.find((e) => e.name === name);
  return found ? `<:${found.name}:${found.id}>` : `:${name}:`;
}

export async function rollAndAnnounceDie({
  channelId,
  sides,
  label,
  random,
}: {
  channelId: bigint;
  sides: number;
  label: string;
  random: () => number;
}) {
  const roll = rollDie({ sides, random });
  const emoji = await getRollEmoji({
    guildId: channelId,
    sides,
    roll,
  });
  await bot.helpers.sendMessage(channelId, {
    content: emoji,
  });
  return { roll, label };
}

export async function getDiceEmojiString({
  guildId,
  roll,
}: {
  guildId: bigint;
  roll: number;
}): Promise<string> {
  const num = roll.toString().padStart(2, "0");
  const name = `d20_${num}`;
  const emojis = await bot.helpers.getEmojis(guildId);
  const emoji = emojis.find((e) => e.name === name);
  if (!emoji) return `:${name}:`;
  return `<:${emoji.name}:${emoji.id}>`;
}

export function attackNarration({
  roll,
  ac,
  target,
}: {
  roll: number;
  ac: number;
  target: string;
}): string {
  const delta = roll - ac;
  if (roll === 1) {
    return `Critical miss! You swing wildly and miss ${target} completely!`;
  }
  if (roll === 20) {
    return `Critical hit! You devastate ${target}!`;
  }
  if (roll < ac) {
    return `Your attack glances off ${target}.`;
  }
  if (roll === ac) {
    return `You barely manage to hit ${target}!`;
  }
  if (delta < 5) {
    return `You strike ${target} with a solid blow!`;
  }
  if (delta < 10) {
    return `A powerful hit! ${target} reels.`;
  }
  return `Overwhelming blow! ${target} is crushed!`;
}
