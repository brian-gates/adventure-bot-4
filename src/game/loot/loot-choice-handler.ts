import { bot } from "~/bot/index.ts";
import { prisma } from "~/db/index.ts";
import { formatGearChoiceMessage, grantRewards } from "./loot-generation.ts";
import type { GearTemplate } from "./gear-templates.ts";
import type { ButtonComponent } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

interface PendingLootChoice {
  playerId: bigint;
  reward: {
    experience: number;
    gold: number;
    gearOptions: GearTemplate[];
  };
  messageId: string;
  channelId: bigint;
}

// Store pending loot choices in memory (in production, consider using Redis or database)
const pendingLootChoices = new Map<string, PendingLootChoice>();

export function createLootChoiceButtons(gearOptions: GearTemplate[]): [
  ButtonComponent,
  ButtonComponent,
  ButtonComponent,
] {
  return [
    {
      type: 2, // Button
      style: 1, // Primary
      label: gearOptions[0]?.name || "No Item",
      customId: "loot_choice_0",
    },
    {
      type: 2, // Button
      style: 1, // Primary
      label: gearOptions[1]?.name || "No Item",
      customId: "loot_choice_1",
    },
    {
      type: 2, // Button
      style: 1, // Primary
      label: gearOptions[2]?.name || "No Item",
      customId: "loot_choice_2",
    },
  ];
}

export function storePendingLootChoice({
  playerId,
  reward,
  messageId,
  channelId,
}: {
  playerId: bigint;
  reward: {
    experience: number;
    gold: number;
    gearOptions: GearTemplate[];
  };
  messageId: string;
  channelId: bigint;
}) {
  const key = `${playerId}_${messageId}`;
  pendingLootChoices.set(key, { playerId, reward, messageId, channelId });

  // Clean up after 5 minutes
  setTimeout(() => {
    pendingLootChoices.delete(key);
  }, 5 * 60 * 1000);
}

export async function handleLootChoice({
  playerId,
  choiceIndex,
  messageId,
  token,
  interactionId,
}: {
  playerId: bigint;
  choiceIndex: number;
  messageId: string;
  token: string;
  interactionId: bigint;
}) {
  const key = `${playerId}_${messageId}`;
  console.log("[handleLootChoice] Looking up key:", key);
  console.log(
    "[handleLootChoice] Available keys:",
    Array.from(pendingLootChoices.keys()),
  );

  const pendingChoice = pendingLootChoices.get(key);

  if (!pendingChoice) {
    return {
      success: false,
      message: "No pending loot choice found or choice has expired.",
    };
  }

  if (
    choiceIndex < 0 || choiceIndex >= pendingChoice.reward.gearOptions.length
  ) {
    return { success: false, message: "Invalid choice index." };
  }

  // Grant the rewards with the selected gear
  await grantRewards({
    playerId,
    reward: pendingChoice.reward,
    selectedGearIndex: choiceIndex,
  });

  // Clean up the pending choice
  pendingLootChoices.delete(key);

  // Format the choice message
  const selectedGear = pendingChoice.reward.gearOptions[choiceIndex];
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  const choiceMessage = formatGearChoiceMessage({
    playerName: player?.name || "Unknown Player",
    selectedGear,
  });

  // Acknowledge the interaction
  await bot.helpers.sendInteractionResponse(interactionId, token, {
    type: 4, // Channel message with source
    data: {
      content: choiceMessage,
      flags: 64, // Ephemeral (only visible to the user)
    },
  });

  return { success: true, message: choiceMessage };
}

export function getPendingChoice(playerId: bigint, messageId: string) {
  const key = `${playerId}_${messageId}`;
  return pendingLootChoices.get(key);
}
