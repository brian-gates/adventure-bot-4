import {
  createBot,
  Intents,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getGuildPlayers } from "~/discord/players.ts";
import { actions } from "~/game/actions/index.ts";
import { inferIntent } from "~/llm/ollama.ts";

const PIXEL_DEV_CHANNEL_ID = 1375304555251765278n;

export function makeBot({ token, botId }: { token: string; botId: bigint }) {
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
        await bot.helpers.startTyping(message.channelId);
        if (message.authorId === botId) return;
        if (message.channelId !== PIXEL_DEV_CHANNEL_ID) return;
        const userInput = message.content.trim();
        if (!userInput) return;
        try {
          const validPlayers = message.guildId
            ? await getGuildPlayers({ bot, guildId: message.guildId })
            : [];
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
          const action = actions[intent as keyof typeof actions];
          if (action) {
            await action({ bot, message, args, validPlayers });
          }
        } catch (err) {
          console.error(err);
          await bot.helpers.sendMessage(message.channelId, {
            content: "Sorry, I couldn't understand that.",
          });
        }
      },
    },
  });
}

export { startBot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
