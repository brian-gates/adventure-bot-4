import * as dotenv from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { makeBot, startBot } from "../discord/bot.ts";
import { getGuildPlayers } from "../discord/players.ts";

await dotenv.load({ export: true });

const token = Deno.env.get("DISCORD_TOKEN")!;
const botId = BigInt(Deno.env.get("DISCORD_BOT_ID")!);
const GUILD_ID = 295458039790567424n;

const bot = makeBot(token, botId);

try {
  const members = await getGuildPlayers(bot, GUILD_ID);
  console.log("[Startup] Guild members:", members);
} catch (err) {
  console.error("[Startup] Failed to fetch guild members:", err);
}

await startBot(bot);
