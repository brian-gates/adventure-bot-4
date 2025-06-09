import type { Bot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ensureAdventurerRole } from "./ensure-adventurer-role.ts";

async function logBotGuildPermissions({
  bot,
  guildId,
}: {
  bot: Bot;
  guildId: string;
}) {
  const botId = bot.applicationId.toString();
  const member = await bot.helpers.getMember(guildId, botId);
  const permissions = member.permissions;
  console.log(
    `[Bot] Bot permissions bitfield in guild ${guildId}: ${permissions}`,
  );
  const perms = permissions ? BigInt(permissions) : 0n;
  const hasManageRoles = (perms & 0x10000000n) !== 0n;
  const hasAdmin = (perms & 0x8n) !== 0n;
  console.log(
    `[Bot] MANAGE_ROLES: ${hasManageRoles}, ADMINISTRATOR: ${hasAdmin}`,
  );
}

export async function registerCommandsAndPermissions({
  bot,
  guildId,
}: {
  bot: Bot;
  guildId: string;
}) {
  await logBotGuildPermissions({ bot, guildId });
  console.log(`[Bot] Registering commands for guild ${guildId}`);
  await bot.helpers.upsertGuildApplicationCommands(guildId, [
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
    {
      name: "map",
      description: "Show the current adventure map",
      options: [],
    },
    {
      name: "resetmap",
      description: "Clear and regenerate the adventure map",
      options: [],
    },
    {
      name: "setseed",
      description: "Set or reset the adventure map seed for this guild",
      options: [
        {
          name: "seed",
          type: 3,
          description: "Seed value (string or UUID)",
          required: true,
        },
      ],
    },
  ]);
  await ensureAdventurerRole({ bot, guildId });
  console.log(`[Bot] Command registration complete for guild ${guildId}`);
}
