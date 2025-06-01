import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export function rollDie({ sides }: { sides: number }) {
  return Math.floor(Math.random() * sides) + 1;
}

async function getRollEmoji(
  bot: Bot,
  guildId: bigint | undefined,
  sides: number,
  roll: number
): Promise<string> {
  if (!guildId || (sides !== 20 && sides !== 4)) return "";
  const num = roll.toString().padStart(2, "0");
  const name = sides === 20 ? `d20_${num}` : `d4_${roll}`;
  const emojis = await bot.helpers.getEmojis(guildId);
  const found = emojis.find((e) => e.name === name);
  return found ? `<:${found.name}:${found.id}>` : `:${name}:`;
}

export async function rollAndAnnounceDie({
  bot,
  interaction,
  sides,
  label,
}: {
  bot: Bot;
  interaction: Interaction;
  sides: number;
  label: string;
}) {
  const channelId = interaction.channelId!;
  const roll = rollDie({ sides });
  const emoji = await getRollEmoji(bot, interaction.guildId, sides, roll);
  await bot.helpers.sendMessage(channelId, {
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
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  const roll = rollDie({ sides: 20 });
  if (!interaction.guildId) return { roll, dice: undefined };
  const dice = await getDiceEmojiString({
    bot,
    guildId: interaction.guildId,
    roll,
  });
  await bot.helpers.sendMessage(interaction.channelId!, {
    content: dice,
  });
  return { roll, dice };
}

export function rollD4() {
  return Math.floor(Math.random() * 4) + 1;
}

export async function rollAndAnnounceD4({
  bot,
  interaction,
  formula = "1d4",
}: {
  bot: Bot;
  interaction: Interaction;
  formula?: string;
}) {
  const roll = rollD4();
  await bot.helpers.sendMessage(interaction.channelId!, {
    content: `<@${BigInt(
      interaction.user?.id ?? interaction.member?.user?.id
    )}> rolled ${formula}: **${roll}**`,
  });
  return { roll };
}
