import {
  createBot,
  Intents,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { findOrCreatePlayer } from "~/db/player.ts";
import { actions } from "~/game/actions/index.ts";
import { inferIntent } from "~/llm/ollama.ts";

const PIXEL_DEV_CHANNEL_ID = 1375304555251765278n;
const GUILD_ID = "YOUR_GUILD_ID"; // Replace with your guild ID
const ATTACK_ROLE_ID = "adventurer"; // Replace with the actual role ID for 'adventurer'

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
          const intent = await inferIntent({
            message: userInput,
          });
          const action = actions[intent as keyof typeof actions];
          if (action) {
            await findOrCreatePlayer({
              id: message.authorId.toString(),
              name:
                message.member?.nick ??
                message.member?.user?.username ??
                "Unknown",
            });
            await action({ bot, message });
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

export async function registerCommandsAndPermissions(bot: any) {
  // Register /attack command
  const commands = await bot.helpers.upsertApplicationCommands(
    [
      {
        name: "attack",
        description: "Attack a target",
        options: [
          {
            name: "target",
            type: 3,
            description: "Target name",
            required: false,
          },
        ],
      },
    ],
    GUILD_ID
  );

  // Find the attack command ID
  const attackCommand = Array.isArray(commands)
    ? commands.find((cmd) => cmd.name === "attack")
    : commands;
  const attackCommandId = attackCommand?.id;
  if (attackCommandId) {
    await bot.helpers.editApplicationCommandPermissions(
      GUILD_ID,
      attackCommandId,
      [
        { id: ATTACK_ROLE_ID, type: 1, permission: true }, // type: 1 = role
      ]
    );
  }
}
