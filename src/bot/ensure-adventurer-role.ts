import type { Role } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { bot } from "~/bot/index.ts";

export async function ensureAdventurerRole({
  guildId,
}: {
  guildId: bigint;
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
