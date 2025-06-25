import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";

export async function equip({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  if (!interaction.guildId || !interaction.channelId) {
    throw new Error("Missing guild or channel ID.");
  }

  const playerId = interaction.user.id;

  // Get player's unequipped gear
  const unequippedGear = await prisma.playerInventory.findMany({
    where: {
      playerId,
      equipped: false,
    },
    include: {
      gear: true,
    },
  });

  if (unequippedGear.length === 0) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "You don't have any unequipped gear in your inventory.",
    });
    return;
  }

  // Create select menu options
  const options = unequippedGear.map((item) => ({
    label: item.gear.name,
    value: item.id.toString(),
    description: `${item.gear.type}${
      item.gear.attack ? ` | Attack: +${item.gear.attack}` : ""
    }${item.gear.defense ? ` | Defense: +${item.gear.defense}` : ""}`,
  }));

  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    content: "Choose gear to equip:",
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 3, // Select Menu
            customId: "equip_gear",
            placeholder: "Select gear to equip",
            options,
          },
        ],
      },
    ],
  });
}
