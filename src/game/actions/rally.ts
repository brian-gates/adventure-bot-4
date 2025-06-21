import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getPlayer } from "~/db/player.ts";
import { bot } from "~/bot/index.ts";
import type { Player } from "~/generated/prisma/client.ts";

export async function getRalliedPlayers({
  channelId,
  guildId,
  waitTime = 10000,
  message =
    "A call to arms echoes through the realm! React with ⚔️ to join the rally!",
}: {
  channelId: bigint;
  guildId: bigint;
  waitTime?: number;
  message?: string;
}): Promise<Player[]> {
  const rallyMessage = await bot.helpers.sendMessage(channelId, {
    content: message,
  });

  await bot.helpers.addReaction(
    rallyMessage.channelId.toString(),
    rallyMessage.id.toString(),
    "⚔️",
  );

  console.log(
    `[rally] Waiting for reactions for ${waitTime / 1000} seconds...`,
  );
  await new Promise((resolve) => setTimeout(resolve, waitTime));

  const reactionUsers = await bot.helpers.getReactions(
    rallyMessage.channelId.toString(),
    rallyMessage.id.toString(),
    "⚔️",
  );
  console.log(`[rally] Got ${reactionUsers.size} reaction users.`);

  const humanUsers = Array.from(reactionUsers.values()).filter(
    (user) => !user.toggles.has("bot"),
  );
  console.log(`[rally] Filtered down to ${humanUsers.length} human users.`);

  if (humanUsers.length === 0) {
    console.log("[rally] No human users joined.");
    return [];
  }

  console.log("[rally] Finding or creating players for human users...");
  const players = await Promise.all(
    humanUsers.map((user) =>
      getPlayer({ id: user.id, name: user.username, guildId })
    ),
  );
  console.log(
    "[rally] Finished creating players. Players:",
    players.map((p) => p.id),
  );

  return players;
}

export async function rally({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  if (!interaction.channelId || !interaction.guildId) {
    throw new Error("Missing channel or guild ID.");
  }

  const channelId = interaction.channelId;
  const guildId = interaction.guildId;
  const players = await getRalliedPlayers({ channelId, guildId });

  if (players.length === 0) {
    await bot.helpers.sendMessage(channelId, {
      content: "No one answered the call to arms.",
    });
    return;
  }

  const playerMentions = players.map((p) => `<@${p.id}>`).join(", ");
  await bot.helpers.sendMessage(channelId, {
    content: `The following adventurers have rallied: ${playerMentions}`,
  });
}
