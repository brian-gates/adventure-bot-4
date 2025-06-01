import * as dotenv from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { makeBot, startBot } from "../discord/bot.ts";
import { getGuildPlayers } from "../discord/players.ts";

await dotenv.load({ export: true });

const bot = makeBot({
  token: Deno.env.get("DISCORD_TOKEN")!,
  botId: BigInt(Deno.env.get("DISCORD_BOT_ID")!),
});

try {
  const members = await getGuildPlayers({
    bot,
    guildId: 295458039790567424n,
  });
  console.log("[Startup] Guild members:", members);
} catch (err) {
  console.error("[Startup] Failed to fetch guild members:", err);
}

await startBot(bot);
