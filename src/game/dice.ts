import { bot } from "~/bot/index.ts";
import type { Emoji } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

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
  sides,
  roll,
}: {
  sides: number;
  roll: number;
}): Promise<string> {
  const name = `d${sides}_${roll}`;
  try {
    const emojis = await bot.rest.runMethod<{ items: Emoji[] }>(
      bot.rest,
      "GET",
      `/applications/${bot.id}/emojis`,
    );
    const emoji = emojis.items.find((e) => e.name === name);
    if (emoji) return `<:${emoji.name}:${emoji.id}>`;
    console.log(`No emoji found for ${name}`);
  } catch (error) {
    console.error(`Error fetching emoji ${name} from application:`, error);
  }
  return "🎲";
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
  const emoji = await getRollEmoji({ sides, roll });

  await bot.helpers.sendMessage(channelId, {
    content: `${emoji} ${label}`,
  });

  return { roll, emoji };
}

export async function rollDieWithMessage({
  guildId,
  sides,
  label,
  random,
}: {
  guildId: bigint;
  sides: number;
  label: string;
  random: () => number;
}) {
  const roll = rollDie({ sides, random });
  const emoji = await getRollEmoji({ sides, roll });
  const message = `${emoji} ${roll} ${label}`;
  return { roll, emoji, message };
}

export async function rollAttackWithMessage({
  guildId,
  _attackerId,
  _target,
  attackSides,
  damageSides,
  attackLabel,
  damageLabel,
  ac,
  random,
}: {
  guildId: bigint;
  _attackerId?: bigint;
  _target: string;
  attackSides: number;
  damageSides: number;
  attackLabel: string;
  damageLabel: string;
  ac: number;
  random: () => number;
}) {
  // Roll attack
  const attackRoll = rollDie({ sides: attackSides, random });
  const attackEmoji = await getRollEmoji({
    sides: attackSides,
    roll: attackRoll,
  });

  // Determine if hit
  const hit = attackRoll >= ac;

  // Roll damage if hit
  let damageRoll = 0;
  let damageEmoji = "";
  if (hit) {
    damageRoll = rollDie({ sides: damageSides, random });
    damageEmoji = await getRollEmoji({
      sides: damageSides,
      roll: damageRoll,
    });
  }

  // Create grouped message
  const attackLine =
    `${attackEmoji} ${attackRoll} ${attackLabel} (vs AC ${ac})`;
  const damageLine = hit
    ? `${damageEmoji} ${damageRoll} ${damageLabel}`
    : "Miss!";
  const message = `${attackLine}\n${damageLine}`;

  return {
    attackRoll,
    attackEmoji,
    hit,
    damageRoll,
    damageEmoji,
    message,
  };
}
