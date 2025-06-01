import { Bot, Message } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { findOrCreatePlayer, setPlayerHealth } from "~/db/player.ts";
import { narrate } from "~/llm/ollama.ts";
import { immersiveRoleplay } from "~/prompts.ts";
import { healthBar } from "~/ui/health-bar.ts";

export async function heal({
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
  const targetPlayer = target
    ? validPlayers.find(
        (p) => (p.nick ?? p.username).toLowerCase() === target.toLowerCase()
      )
    : { id: message.authorId.toString(), username: "", nick: "" };
  if (!targetPlayer || !targetPlayer.id) {
    await bot.helpers.sendMessage(message.channelId, {
      content: `<@${message.authorId}>, whom are you healing?`,
    });
    return;
  }
  const dbPlayer = await findOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.nick ?? targetPlayer.username,
  });
  const healAmount = 3;
  const newHealth = Math.min(dbPlayer.maxHealth, dbPlayer.health + healAmount);
  await setPlayerHealth({ id: targetPlayer.id, health: newHealth });

  const prompt = [
    `Narrate a magical or fantasy healing in a Discord RPG.`,
    `The healer is <@${message.authorId}> (use this exact mention format for the healer).`,
    `The target is <@${targetPlayer.id}>.`,
    `The amount healed is ${healAmount}.`,
    `The target's new health is ${newHealth}.`,
    `Respond ONLY with a single vivid, immersive sentence.`,
    `Do not include any JSON or extra formatting.`,
    `Express the quantity of healing abstractly, avoid mentioning any game mechanics like health points overtly, keep it flavorful and immersive.`,
    `Always refer to the healer using the exact mention string <@${message.authorId}> so Discord renders it as a clickable mention.`,
    immersiveRoleplay,
  ].join(" ");
  const narration = await narrate(prompt);
  await bot.helpers.sendMessage(message.channelId, {
    content: narration,
  });

  const image = await healthBar({
    current: newHealth,
    max: dbPlayer.maxHealth,
    heal: healAmount,
    width: 200,
    height: 24,
  });
  await bot.helpers.sendMessage(message.channelId, {
    content: `<@${targetPlayer.id}>'s health bar:`,
    file: { blob: new Blob([image]), name: "healthbar.png" },
  });
}
