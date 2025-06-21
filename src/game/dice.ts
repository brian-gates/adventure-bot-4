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

async function getRollEmoji({
  guildId,
  sides,
  roll,
}: {
  guildId: bigint;
  sides: number;
  roll: number;
}): Promise<string> {
  const name = `d${sides}_${roll}`;
  try {
    const emojis = await bot.helpers.getEmojis(guildId);
    const emoji = emojis.find((e) => e.name === name);
    if (emoji) return `<:${emoji.name}:${emoji.id}>`;
    console.log(`No emoji found for ${name}`);
  } catch (error) {
    console.error(`Error fetching emoji ${name} from guild ${guildId}:`, error);
  }
  return "🎲";
}

export async function rollAndAnnounceDie({
  channelId,
  guildId,
  sides,
  label,
  random,
}: {
  channelId: bigint;
  guildId: bigint;
  sides: number;
  label: string;
  random: () => number;
}) {
  const roll = rollDie({ sides, random });
  const emoji = await getRollEmoji({ guildId, sides, roll });

  await bot.helpers.sendMessage(channelId, {
    content: `${emoji} ${roll} ${label}`,
  });

  return { roll, emoji };
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
