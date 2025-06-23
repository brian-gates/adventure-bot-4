import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getOrCreatePlayer } from "~/db/player.ts";
import { getTargetPlayer } from "~/discord/get-target.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";
import { prisma } from "~/db/index.ts";

export async function inspect({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  if (!interaction.guildId || !interaction.channelId) {
    throw new Error("Missing guild or channel ID.");
  }

  const target = await getTargetPlayer({
    interaction,
    guildId: interaction.guildId,
  });

  const player = await getOrCreatePlayer({
    id: target?.id ?? interaction.user.id,
    name: target?.name ?? interaction.user.username,
    guildId: interaction.guildId,
  });

  // Get player's equipped weapon
  const equippedWeapon = await prisma.playerInventory.findFirst({
    where: {
      playerId: player.id,
      equipped: true,
      gear: {
        type: "weapon",
      },
    },
    include: {
      gear: true,
    },
  });

  // Get player's inventory
  const inventory = await prisma.playerInventory.findMany({
    where: {
      playerId: player.id,
    },
    include: {
      gear: true,
    },
  });

  const healthBarImage = await getHealthBarImage({
    current: player.health,
    max: player.maxHealth,
    label: player.name,
  });

  const fileName = `${player.name}-health-bar.png`;

  // Build inventory text
  let inventoryText = "";
  if (inventory.length > 0) {
    inventoryText = "\n\n**Inventory:**";
    inventory.forEach((item: { equipped: boolean; gear: { name: string } }) => {
      const equipped = item.equipped ? " (equipped)" : "";
      inventoryText += `\n• ${item.gear.name}${equipped}`;
    });
  } else {
    inventoryText = "\n\n**Inventory:** Empty";
  }

  // Build equipped weapon text
  let weaponText = "";
  if (equippedWeapon) {
    weaponText = `\n**Equipped Weapon:** ${equippedWeapon.gear.name}`;
  } else {
    weaponText = "\n**Equipped Weapon:** None (unarmed)";
  }

  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    embeds: [
      {
        title: `Stats for ${player.name}`,
        fields: [
          {
            name: "HP",
            value: `${player.health}/${player.maxHealth}`,
            inline: true,
          },
          {
            name: "Level",
            value: `${player.level ?? 1}`,
            inline: true,
          },
          {
            name: "Experience",
            value: `${player.experience ?? 0}`,
            inline: true,
          },
          {
            name: "Gold",
            value: `${player.gold ?? 0}`,
            inline: true,
          },
        ],
        description: weaponText + inventoryText,
        image: {
          url: `attachment://${fileName}`,
        },
      },
    ],
    file: {
      blob: new Blob([healthBarImage]),
      name: fileName,
    },
  });
}
