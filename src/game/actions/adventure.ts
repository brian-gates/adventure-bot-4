import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { GameMap } from "~/game/map/game-map.ts";
import { narrate } from "~/llm/index.ts";

export async function adventure({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  console.log("Adventure command initiated");
  if (!interaction.channelId || !interaction.guildId) {
    console.warn("Missing channelId or guildId for interaction");
    return;
  }
  const guildId = interaction.guildId;
  const gameMap = await GameMap.getByGuildId(guildId);
  if (!gameMap) {
    console.log("No current location or map set for guild");
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "No current location or map set for this guild.",
    });
    return;
  }
  const location = gameMap.currentLocation;
  if (!location) {
    console.log("No current location set for guild");
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "No current location set for this guild.",
    });
    return;
  }
  console.log("Current location:", location.name);
  const nextLocations = gameMap.getNextLocations({ id: location.id });
  if (nextLocations.length === 0) {
    console.log("No paths found for current location");
    await bot.helpers.sendMessage(interaction.channelId, {
      content: "You have reached the end of the adventure!",
    });
    return;
  }
  const options = nextLocations
    .map((loc) => `- ${loc.name} (${loc.type})`)
    .join("\n");
  const narration = await narrate({
    prompt: `Narrate a short, vivid fantasy adventure for <@${
      interaction.user?.id ?? interaction.member?.user?.id
    }> in a Discord RPG. Respond with a single immersive sentence.`,
  });
  await bot.helpers.sendMessage(interaction.channelId, {
    content: `${narration}\n\n**Paths ahead:**\n${options}`,
  });
  console.log("Adventure message sent to channel");
}
