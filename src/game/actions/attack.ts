import { Bot, Message } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import {
  findOrCreatePlayer,
  setPlayerHealth,
  setPlayerLastTarget,
} from "~/db/player.ts";
import { getGuildPlayers } from "~/discord/players.ts";
import { rollAndAnnounceDie } from "~/game/dice.ts";
import { inferTarget } from "~/game/players.ts";
import { narrate } from "~/llm/ollama.ts";
import { immersiveRoleplay } from "~/prompts.ts";
import { healthBar } from "~/ui/health-bar.ts";

export async function attack({ bot, message }: { bot: Bot; message: Message }) {
  const validPlayers = message.guildId
    ? await getGuildPlayers({ bot, guildId: message.guildId })
    : [];
  const targetPlayer = inferTarget({
    target: null,
    validPlayers,
    authorId: message.authorId,
  });
  if (typeof targetPlayer === "string" || !targetPlayer.id) {
    await bot.helpers.sendMessage(message.channelId, {
      content: `<@${message.authorId}>, whom would you like to attack?`,
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
  const player = await findOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.nick ?? targetPlayer.username,
  });
  const actualDamage = player ? Math.min(damage, player.health) : 0;
  const newHealth = player
    ? Math.max(0, player.health - actualDamage)
    : undefined;
  if (player && newHealth !== undefined) {
    await setPlayerHealth({ id: targetPlayer.id, health: newHealth });
    await findOrCreatePlayer({
      id: message.authorId.toString(),
      name: "Unknown",
    });
    await setPlayerLastTarget({
      id: message.authorId.toString(),
      lastTarget: targetPlayer.id,
    });
  }
  const prompt = [
    `Narrate an attack in a fantasy Discord RPG.`,
    `The attacker is <@${message.authorId}> (use this exact mention format for the attacker).`,
    `The target is ${targetPlayer.nick ?? targetPlayer.username}.`,
    `The d20 roll was ${d20} against AC 10.`,
    `The damage roll was ${damage} (1d4 unarmed).`,
    newHealth !== undefined
      ? `The target's new health is ${newHealth}.`
      : `The target's health is unknown.`,
    `Respond ONLY with a single vivid, immersive sentence.`,
    `Do not include any JSON or extra formatting.`,
    `Always refer to the attacker using the exact mention string <@${message.authorId}> so Discord renders it as a clickable mention.`,
    immersiveRoleplay,
  ].join(" ");
  const narration = await narrate({ prompt });
  await bot.helpers.sendMessage(message.channelId, {
    content: narration,
  });

  if (player && newHealth !== undefined) {
    await bot.helpers.sendMessage(message.channelId, {
      content: `<@${targetPlayer.id}>'s health:`,
      file: {
        blob: new Blob([
          await healthBar({
            current: newHealth,
            max: player.maxHealth,
            damage: actualDamage,
            width: 200,
            height: 24,
          }),
        ]),
        name: "healthbar.png",
      },
    });
  }
}
