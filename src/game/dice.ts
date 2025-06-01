import { Bot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export function rollDie({ sides }: { sides: number }) {
  return Math.floor(Math.random() * sides) + 1;
}

export async function rollAndAnnounceDie({
  bot,
  message,
  sides,
  label,
}: {
  bot: Bot;
  message: { authorId: bigint; channelId: bigint; guildId?: bigint };
  sides: number;
  label: string;
}) {
  const roll = rollDie({ sides });
  let emoji = "";
  if (message.guildId && (sides === 20 || sides === 4)) {
    const num = roll.toString().padStart(2, "0");
    const name = sides === 20 ? `d20_${num}` : `d4_${roll}`;
    const emojis = await bot.helpers.getEmojis(message.guildId);
    const found = emojis.find((e) => e.name === name);
    emoji = found ? `<:${found.name}:${found.id}>` : `:${name}:`;
  }
  await bot.helpers.sendMessage(message.channelId, {
    content: emoji,
  });
  return { roll, label };
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
  const roll = rollDie({ sides: 20 });
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

export function rollD4() {
  return Math.floor(Math.random() * 4) + 1;
}

export async function rollAndAnnounceD4({
  bot,
  message,
  formula = "1d4",
}: {
  bot: Bot;
  message: { authorId: bigint; channelId: bigint };
  formula?: string;
}) {
  const roll = rollD4();
  await bot.helpers.sendMessage(message.channelId, {
    content: `<@${message.authorId}> rolled ${formula}: **${roll}**`,
  });
  return { roll };
}
