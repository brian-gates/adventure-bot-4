import { Bot, Message } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { findOrCreatePlayer, setPlayerHealth } from "../../db/player.ts";
import { narrate } from "../../llm/ollama.ts";
import { rollAndAnnounceDie } from "../dice.ts";

export async function attack({
  bot,
  message,
  args,
  validPlayers,
}: {
  bot: Bot;
  message: Message;
  args?: { target?: string };
  validPlayers: { id: string; username: string; nick?: string }[];
}) {
  const target =
    args &&
    typeof args === "object" &&
    "target" in args &&
    typeof args.target === "string"
      ? args.target
      : null;
  const targetPlayer = validPlayers.find(
    (p) =>
      (p.nick ?? p.username).toLowerCase() === (target?.toLowerCase() ?? "")
  );
  if (!targetPlayer || !targetPlayer.id) {
    await bot.helpers.sendMessage(message.channelId, {
      content: `<@${message.authorId}>, whom are you attacking?`,
    });
    return;
  }
  const { roll: d20 } = await rollAndAnnounceDie({
    bot,
    message,
    sides: 20,
    label: "d20",
  });
  const { roll: damage } = await rollAndAnnounceDie({
    bot,
    message,
    sides: 4,
    label: "1d4 (unarmed)",
  });
  const dbPlayer = await findOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.nick ?? targetPlayer.username,
  });
  const newHealth = dbPlayer
    ? Math.max(0, dbPlayer.health - damage)
    : undefined;
  if (dbPlayer && newHealth !== undefined) {
    await setPlayerHealth({ id: targetPlayer.id, health: newHealth });
  }
  const prompt = [
    `Narrate an attack in a fantasy Discord RPG.`,
    `The attacker is <@${message.authorId}> (use this exact mention format for the attacker).`,
    `The target is ${target}.`,
    `The d20 roll was ${d20} against AC 10.`,
    `The damage roll was ${damage} (1d4 unarmed).`,
    newHealth !== undefined
      ? `The target's new health is ${newHealth}.`
      : `The target's health is unknown.`,
    `Respond ONLY with a single vivid, immersive sentence.`,
    `Do not include any JSON or extra formatting.`,
    `Avoid mentioning any game mechanics or system messages overtly, keep it flavorful and immersive.`,
    `Always refer to the attacker using the exact mention string <@${message.authorId}> so Discord renders it as a clickable mention.`,
  ].join(" ");
  const narration = await narrate(prompt);
  await bot.helpers.sendMessage(message.channelId, {
    content: narration,
  });
}
