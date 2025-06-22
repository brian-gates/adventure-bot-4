import {
  createBot,
  Intents,
  InteractionResponseTypes,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { registerCommandsAndPermissions } from "~/bot/register-commands-and-permissions.ts";
import { actions } from "~/game/actions/index.ts";
import { seedMapForGuild } from "../game/map/seed-map-for-guild.ts";
import { handleLootChoice } from "~/game/loot/loot-choice-handler.ts";
import { seededRandom } from "../game/seeded-random.ts";
import { findOrCreateGuild } from "../db/find-or-create-guild.ts";

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
      guildCreate: async (_, guild) => {
        await seedMapForGuild({ id: guild.id });
        await registerCommandsAndPermissions({
          guildId: guild.id,
        });
        console.log(
          `[Bot] Registered commands and seeded map for guild ${guild.id}`,
        );
      },
      interactionCreate: async (bot, interaction) => {
        console.log("[Interaction] Received interaction:", {
          type: interaction.type,
          customId: interaction.data?.customId,
          name: interaction.data?.name,
        });

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

          if (!interaction.guildId) {
            return;
          }

          const guild = await findOrCreateGuild({ id: interaction.guildId });
          await actions[interaction.data.name as keyof typeof actions]({
            bot,
            interaction,
            random: seededRandom(guild.seed, guild.randomCursor),
          });
        }

        // Handle button interactions for loot choices
        if (
          interaction.type === 3 &&
          interaction.data?.customId?.startsWith("loot_choice_")
        ) {
          const choiceIndex = parseInt(interaction.data.customId.split("_")[2]);
          const playerId = BigInt(interaction.user.id);
          const messageId = interaction.message?.id.toString() || "";

          console.log("[Button Interaction] Loot choice clicked:", {
            playerId: playerId.toString(),
            choiceIndex,
            messageId,
            customId: interaction.data.customId,
          });

          const result = await handleLootChoice({
            playerId,
            choiceIndex,
            messageId,
            token: interaction.token,
          });

          if (!result.success) {
            await bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content: result.message,
                  flags: 64, // Ephemeral
                },
              },
            );
          }
          return;
        }
      },
    },
  });
  console.log("[Bot] Bot instance created.");
  return botInstance;
}
