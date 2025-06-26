import type {
  Bot,
  Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";
import { seedMapForGuild } from "../map/seed-map-for-guild.ts";
import { seededRandom } from "~/game/seeded-random.ts";

export const setseed = async ({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) => {
  const guildId = interaction.guildId;
  if (!guildId) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "This command can only be used in a server.",
    });
    return;
  }
  // Extract subcommand options for /set seed
  const subcommandOptions = interaction.data?.options?.[0]?.options;
  const seed = subcommandOptions?.find((o) => o.name === "seed")?.value;
  if (!seed || typeof seed !== "string") {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "You must provide a seed value.",
    });
    return;
  }
  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { seed, randomCursor: 0 },
      create: { id: guildId, seed },
    });

    // Delete the map - cascade deletes will handle all related records
    await prisma.map.deleteMany({ where: { guild: { is: { id: guildId } } } });

    await seedMapForGuild({ id: guildId, random: seededRandom(seed) });

    // Fetch the new map and render it
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { map: { include: { locations: true, paths: true } } },
    });
    if (!guild?.map) {
      await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        content: `Seed set to \`${seed}\` but no map found after regeneration.`,
      });
      return;
    }
    // Use GameMap to render SVG and PNG
    const { GameMap } = await import("~/game/map/game-map.ts");
    const { renderMapSvg } = await import("~/game/map/render-map-svg.ts");
    const { svgToPng } = await import("~/util/svg-to-png.ts");
    const map = new GameMap(guild.map);
    const svg = renderMapSvg(map);
    const png = await svgToPng(svg);
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      embeds: [
        {
          title: "Adventure Map",
          description: `Seed: \`${seed}\`\nMap has been regenerated.`,
          image: { url: "attachment://map.png" },
        },
      ],
      file: [
        { blob: new Blob([png], { type: "image/png" }), name: "map.png" },
      ],
    });
  } catch (err) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: `Error setting seed: ${err}`,
    });
  }
};
