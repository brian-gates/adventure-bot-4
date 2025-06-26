import { ensureAdventurerRole } from "./ensure-adventurer-role.ts";
import { bot } from "~/bot/index.ts";

async function logBotGuildPermissions({
  guildId,
}: {
  guildId: bigint;
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
  guildId,
}: {
  guildId: bigint;
}) {
  await logBotGuildPermissions({ guildId });
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
      name: "rally",
      description: "Call for adventurers to rally",
      options: [],
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
      name: "set",
      description: "Set various game parameters (admin only)",
      options: [
        {
          name: "health",
          description: "Set a player's health",
          type: 1, // SUB_COMMAND
          options: [
            {
              name: "target",
              type: 6, // USER
              description: "Target user",
              required: true,
            },
            {
              name: "health",
              type: 4, // INTEGER
              description: "Health value",
              required: true,
            },
          ],
        },
        {
          name: "seed",
          description: "Set the adventure map seed for this guild",
          type: 1, // SUB_COMMAND
          options: [
            {
              name: "seed",
              type: 3, // STRING
              description: "Seed value (string or UUID)",
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "emoji",
      description: "Upload dice emojis to the server",
      options: [],
    },
    {
      name: "inspect",
      description: "Inspect a player's status",
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
      name: "equip",
      description: "Equip a weapon from your inventory",
      options: [],
    },
  ]);
  await ensureAdventurerRole({ guildId });
  console.log(`[Bot] Command registration complete for guild ${guildId}`);
}
