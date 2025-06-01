import { Bot, Message } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { narrate } from "../../llm/ollama.ts";
import { rollAndAnnounceD20 } from "../dice.ts";

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
  if (
    !target ||
    !validPlayers.some(
      (p) => (p.nick ?? p.username).toLowerCase() === target.toLowerCase()
    )
  ) {
    await bot.helpers.sendMessage(message.channelId, {
      content: `<@${message.authorId}>, whom are you attacking?`,
    });
    return;
  }
  const { roll } = await rollAndAnnounceD20({ bot, message });
  const prompt = [
    `Narrate an attack in a fantasy Discord RPG.`,
    `The attacker is <@${message.authorId}> (use this exact mention format for the attacker).`,
    `The target is ${target}.`,
    `The d20 roll was ${roll} against AC 10.`,
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
