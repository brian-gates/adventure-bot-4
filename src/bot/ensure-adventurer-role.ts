import type { Bot, Role } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export async function ensureAdventurerRole({
  bot,
  guildId,
}: {
  bot: Bot;
  guildId: string;
}): Promise<string> {
  console.log(`[Bot] Ensuring Adventurer role exists in guild ${guildId}`);
  const roles = await bot.helpers.getRoles(guildId);
  let adventurerRole = roles.find((role: Role) => role.name === "Adventurer");
  if (!adventurerRole) {
    console.log(`[Bot] Creating Adventurer role in guild ${guildId}`);
    adventurerRole = await bot.helpers.createRole(guildId, {
      name: "Adventurer",
    });
  }
  console.log(
    `[Bot] Adventurer role ID for guild ${guildId}: ${adventurerRole.id}`,
  );
  return adventurerRole.id.toString();
}
