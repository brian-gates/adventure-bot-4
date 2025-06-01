import { Bot, Message } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { findOrCreatePlayer, setPlayerHealth } from "~/db/player.ts";
import { getGuildPlayers } from "~/discord/players.ts";
import { rollDie } from "~/game/dice.ts";
import { inferTarget } from "~/game/players.ts";
import { narrate } from "~/llm/ollama.ts";
import {
  defaultResponseTemplate,
  immersiveRoleplay,
  mentionInstruction,
} from "~/prompts.ts";
import { healthBar } from "~/ui/health-bar.ts";

export async function heal({ bot, message }: { bot: Bot; message: Message }) {
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
      content: `<@${message.authorId}>, whom would you like to heal?`,
    });
    return;
  }
  const player = await findOrCreatePlayer({
    id: targetPlayer.id,
    name: targetPlayer.nick ?? targetPlayer.username,
  });
  const healAmount = rollDie({ sides: 4 });
  const newHealth = Math.min(player.maxHealth, player.health + healAmount);
  await setPlayerHealth({ id: targetPlayer.id, health: newHealth });

  const prompt = [
    `Narrate a magical or fantasy healing in a Discord RPG.`,
    `The healer is <@${message.authorId}> (use this exact mention format for the healer).`,
    `The target is <@${targetPlayer.id}>.`,
    `The amount healed is ${healAmount}.`,
    `The target's new health is ${newHealth}.`,
    ...defaultResponseTemplate,
    mentionInstruction({
      role: "healer",
      authorId: message.authorId.toString(),
    }),
    immersiveRoleplay,
  ].join(" ");
  await bot.helpers.sendMessage(message.channelId, {
    content: await narrate({ prompt }),
  });

  await bot.helpers.sendMessage(message.channelId, {
    content: `<@${targetPlayer.id}>'s health bar:`,
    file: {
      blob: new Blob([
        await healthBar({
          current: newHealth,
          max: player.maxHealth,
          heal: healAmount,
          width: 200,
          height: 24,
        }),
      ]),
      name: "healthbar.png",
    },
  });
}
