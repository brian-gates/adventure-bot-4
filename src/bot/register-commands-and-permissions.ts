import type { Bot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ensureAdventurerRole } from "./ensure-adventurer-role.ts";

export async function registerCommandsAndPermissions({
  bot,
  guildId,
}: {
  bot: Bot;
  guildId: string;
}) {
  console.log(`[Bot] Registering commands for guild ${guildId}`);
  const commands = await bot.helpers.upsertGuildApplicationCommands(guildId, [
    {
      name: "attack",
      description: "Attack a target",
      options: [
        {
          name: "target",
          type: 3,
          description: "Target name",
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      name: "heal",
      description: "Heal a target",
      options: [
        {
          name: "target",
          type: 3,
          description: "Target name",
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      name: "adventure",
      description: "Go on an adventure",
      options: [],
    },
  ]);

  const adventurerRoleId = await ensureAdventurerRole({ bot, guildId });

  const attackCommand = [...commands.values()].find(
    (cmd) => cmd.name === "attack"
  );
  const attackCommandId = attackCommand?.id;
  if (attackCommandId) {
    console.log(
      `[Bot] Setting permissions for /attack command (${attackCommandId}) in guild ${guildId}`
    );
    await bot.helpers.editApplicationCommandPermissions(
      bot.applicationId,
      guildId,
      attackCommandId.toString(),
      [{ id: adventurerRoleId, type: 1, permission: true }]
    );
  } else {
    console.log(
      `[Bot] Could not find /attack command to set permissions in guild ${guildId}`
    );
  }
  console.log(`[Bot] Command registration complete for guild ${guildId}`);
}
