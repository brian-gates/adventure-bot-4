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

  // Get player's inventory with gear details
  const inventory = await prisma.playerInventory.findMany({
    where: {
      playerId,
      gear: {
        type: "weapon",
      },
    },
    include: {
      gear: true,
    },
  });

  if (inventory.length === 0) {
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content: "You don't have any weapons in your inventory to equip.",
    });
    return;
  }

  // Unequip all current weapons first
  await prisma.playerInventory.updateMany({
    where: {
      playerId,
      equipped: true,
      gear: {
        type: "weapon",
      },
    },
    data: {
      equipped: false,
    },
  });

  // Equip the first weapon (for now, just equip the first one)
  // In the future, this could be enhanced to let players choose which weapon to equip
  const firstWeapon = inventory[0];
  await prisma.playerInventory.update({
    where: {
      id: firstWeapon.id,
    },
    data: {
      equipped: true,
    },
  });

  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    content: `You have equipped **${firstWeapon.gear.name}**!`,
  });
}
