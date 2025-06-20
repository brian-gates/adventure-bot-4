import { Bot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export async function getGuildPlayers({
  bot,
  guildId,
}: {
  bot: Bot;
  guildId: bigint;
}) {
  const members = await bot.helpers.getMembers(guildId, { limit: 1000 });
  return members
    .filter((m) => Boolean(m.user))
    .map((m) => ({
      id: m.user!.id.toString(),
      username: m.user!.username,
      nick: m.nick,
    }));
}
