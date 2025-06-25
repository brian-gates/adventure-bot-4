import {
  type Bot,
  type Interaction,
  InteractionResponseTypes,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { prisma } from "~/db/index.ts";

export async function handleSelectMenu(bot: Bot, interaction: Interaction) {
  console.log("[Select Menu] Checking interaction:", {
    type: interaction.type,
    customId: interaction.data?.customId,
  });

  if (interaction.type !== 3 || interaction.data?.customId !== "equip_gear") {
    console.log("[Select Menu] Not handling this interaction");
    return;
  }

  console.log("[Select Menu] Handling equip_gear interaction");

  const playerId = BigInt(interaction.user.id);
  const gearId = interaction.data.values?.[0];

  console.log(
    "[Select Menu] Player ID:",
    playerId.toString(),
    "Gear ID:",
    gearId,
  );

  if (!gearId) {
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: "No gear selected.",
          flags: 64, // Ephemeral
        },
      },
    );
    return;
  }

  try {
    // Get the gear details first
    const gearToEquip = await prisma.playerInventory.findUnique({
      where: {
        id: gearId,
        playerId, // Ensure the gear belongs to the player
      },
      include: {
        gear: true,
      },
    });

    console.log("[Select Menu] Found gear:", gearToEquip?.gear.name);

    if (!gearToEquip) {
      await bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: "Gear not found or doesn't belong to you.",
            flags: 64, // Ephemeral
          },
        },
      );
      return;
    }

    // Unequip any gear of the same type
    await prisma.playerInventory.updateMany({
      where: {
        playerId,
        equipped: true,
        gear: {
          type: gearToEquip.gear.type,
        },
      },
      data: {
        equipped: false,
      },
    });

    // Equip the selected gear
    await prisma.playerInventory.update({
      where: {
        id: gearId,
      },
      data: {
        equipped: true,
      },
    });

    console.log("[Select Menu] Successfully equipped:", gearToEquip.gear.name);

    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.UpdateMessage,
        data: {
          content: `You have equipped **${gearToEquip.gear.name}**!`,
          components: [], // Remove the select menu
        },
      },
    );
  } catch (error) {
    console.error("[Select Menu] Error equipping gear:", error);
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: "Failed to equip gear. Please try again.",
          flags: 64, // Ephemeral
        },
      },
    );
  }
}
