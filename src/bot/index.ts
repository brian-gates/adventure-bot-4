import * as dotenv from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { makeBot, startBot } from "./bot.ts";

await dotenv.load({ export: true });

export const bot = makeBot({
  token: Deno.env.get("DISCORD_TOKEN")!,
  botId: BigInt(Deno.env.get("DISCORD_BOT_ID")!),
});

await startBot(bot);
