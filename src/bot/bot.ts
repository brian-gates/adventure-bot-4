import {
  createBot,
  Intents,
  InteractionResponseTypes,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { registerCommandsAndPermissions } from "~/bot/register-commands-and-permissions.ts";
import { actions } from "~/game/actions/index.ts";
import { seedMapForGuild } from "~/game/map/seed-map.ts";

export { startBot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export function makeBot({ token, botId }: { token: string; botId: bigint }) {
  console.log("[Bot] Creating bot instance...");
  const botInstance = createBot({
    token,
    botId,
    intents: Intents.Guilds |
      Intents.GuildMessages |
      Intents.MessageContent |
      Intents.GuildMembers,
    events: {
      guildCreate: async (bot, guild) => {
        await seedMapForGuild({ id: guild.id });
        await registerCommandsAndPermissions({
          bot,
          guildId: guild.id,
        });
        console.log(
          `[Bot] Registered commands and seeded map for guild ${guild.id}`,
        );
      },
      interactionCreate: async (bot, interaction) => {
        if (
          interaction.type === 4 &&
          (interaction.data?.name === "attack" ||
            interaction.data?.name === "heal")
        ) {
          const inputRaw = interaction.data.options?.[0]?.value;
          const input = typeof inputRaw === "string"
            ? inputRaw.toLowerCase()
            : "";
          const membersRaw = interaction.guildId
            ? await bot.helpers.getMembers(interaction.guildId, { limit: 1000 })
            : [];
          const members = Array.isArray(membersRaw)
            ? membersRaw
            : Array.from(membersRaw.values ? membersRaw.values() : []);
          const userChoices = members
            .filter((m) => m.user)
            .map((m) => ({
              name: m.nick ?? m.user!.username,
              value: m.user!.id.toString(),
            }));
          const allChoices = [...userChoices]
            .filter((choice) => choice.name.toLowerCase().includes(input))
            .slice(0, 25);
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: 8,
              data: { choices: allChoices },
            },
          );
          return;
        }
        if (
          interaction.type === 2 &&
          interaction.data?.name &&
          (Object.keys(actions) as (keyof typeof actions)[]).includes(
            interaction.data.name as keyof typeof actions,
          )
        ) {
          await bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.DeferredChannelMessageWithSource,
            },
          );
          await actions[interaction.data.name as keyof typeof actions]({
            bot,
            interaction,
          });
        }
      },
    },
  });
  console.log("[Bot] Bot instance created.");
  return botInstance;
}
