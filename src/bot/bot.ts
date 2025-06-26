import {
  createBot,
  Intents,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { registerCommandsAndPermissions } from "~/bot/register-commands-and-permissions.ts";
import { findOrCreateGuild } from "~/db/find-or-create-guild.ts";
import { seedMapForGuild } from "~/game/map/seed-map-for-guild.ts";
import { handleInteraction } from "./interactions/index.ts";
import { guildRandom } from "~/game/guild-random.ts";

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
      guildCreate: async (_, { id }) => {
        const guild = await findOrCreateGuild({ id });

        const random = guildRandom({
          guildId: guild.id,
          seed: guild.seed,
          cursor: guild.randomCursor,
        });
        await seedMapForGuild({ id: guild.id, random });
        await registerCommandsAndPermissions({
          guildId: guild.id,
        });
        console.log(
          `[Bot] Registered commands and seeded map for guild ${guild.id}`,
        );
      },
      interactionCreate: handleInteraction,
    },
  });
  console.log("[Bot] Bot instance created.");
  return botInstance;
}
