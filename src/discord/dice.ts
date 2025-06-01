import { Bot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

export async function getDiceEmojiString({
  bot,
  guildId,
  roll,
}: {
  bot: Bot;
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

export async function rollAndAnnounceD20({
  bot,
  message,
}: {
  bot: Bot;
  message: { authorId: bigint; channelId: bigint; guildId?: bigint };
}) {
  const roll = rollD20();
  if (!message.guildId) return { roll, dice: undefined };
  const dice = await getDiceEmojiString({
    bot,
    guildId: message.guildId,
    roll,
  });
  await bot.helpers.sendMessage(message.channelId, {
    content: dice,
  });
  return { roll, dice };
}
