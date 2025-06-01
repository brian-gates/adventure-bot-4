import {
  createBot,
  Intents,
  startBot,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { inferIntent } from "../llm/ollama.ts";
import { attack } from "./actions/attack.ts";
import { rollD20 } from "./dice.ts";
import { getGuildPlayers } from "./players.ts";

const PIXEL_DEV_CHANNEL_ID = 1375304555251765278n;
const DEFAULT_AC = 10;

export function makeBot(token: string, botId: bigint) {
  return createBot({
    token,
    botId,
    intents:
      Intents.Guilds |
      Intents.GuildMessages |
      Intents.MessageContent |
      Intents.GuildMembers,
    events: {
      messageCreate: async (bot, message) => {
        if (message.authorId === botId) return;
        if (message.channelId !== PIXEL_DEV_CHANNEL_ID) return;
        const userInput = message.content.trim();
        if (!userInput) return;
        try {
          let validPlayers: { id: string; username: string; nick?: string }[] =
            [];
          if (message.guildId) {
            validPlayers = await getGuildPlayers(bot, message.guildId);
          }
          const context =
            validPlayers.length > 0
              ? `Valid player targets: ${validPlayers
                  .map((p) => p.nick ?? p.username)
                  .join(", ")}.`
              : undefined;
          const { intent, args } = await inferIntent({
            message: userInput,
            context,
          });
          if (intent === "attack") {
            const target =
              args &&
              typeof args === "object" &&
              "target" in args &&
              typeof (args as any).target === "string"
                ? (args as any).target
                : null;
            if (
              !target ||
              !validPlayers.some(
                (p) =>
                  (p.nick ?? p.username).toLowerCase() === target.toLowerCase()
              )
            ) {
              await bot.helpers.sendMessage(message.channelId, {
                content: "You must mention a real player to attack!",
              });
              return;
            }
            const roll = rollD20();
            const narration = attack({
              validPlayers,
              target,
              ac: DEFAULT_AC,
              roll,
            });
            await bot.helpers.sendMessage(message.channelId, {
              content: narration,
            });
          } else if (intent === "heal") {
            await bot.helpers.sendMessage(message.channelId, {
              content: "You heal yourself!",
            });
          } else if (intent === "look") {
            await bot.helpers.sendMessage(message.channelId, {
              content: "You look around.",
            });
          } else {
            await bot.helpers.sendMessage(message.channelId, {
              content: `Unknown intent: ${intent}`,
            });
          }
        } catch (err) {
          await bot.helpers.sendMessage(message.channelId, {
            content: "Sorry, I couldn't understand that.",
          });
        }
      },
    },
  });
}

export { startBot };
