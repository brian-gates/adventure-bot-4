import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getOrCreatePlayer } from "~/db/player.ts";
import { bot } from "~/bot/index.ts";

export const getTargetId = ({ data }: Interaction) => {
  const value = data?.options?.find((opt) => opt.name === "target")?.value;
  return value != null &&
      (typeof value === "string" || typeof value === "number")
    ? BigInt(value)
    : undefined;
};

export const getUsernameFromInteraction = ({
  interaction,
  userId,
}: {
  interaction: Interaction;
  userId: bigint;
}) => {
  // Check if this is the bot itself
  if (userId === bot.id) {
    // Try to get bot username from interaction.user if it's the bot
    if (interaction.user.id === userId && interaction.user.username) {
      return interaction.user.username;
    }
    // Fall back to a default bot name if we can't get it
    return "Adventure Bot";
  }

  // First try to get from interaction.user
  if (interaction.user.id === userId && interaction.user.username) {
    return interaction.user.username;
  }

  // Then try to get from resolved users
  const users = interaction.data?.resolved?.users as
    | Record<string, { username?: string }>
    | undefined;
  const resolvedName = users?.[userId.toString()]?.username;

  // Finally fall back to user ID as string
  return resolvedName ?? userId.toString();
};

export const getTargetPlayer = async ({
  interaction,
  guildId,
}: {
  interaction: Interaction;
  guildId: bigint;
}) => {
  const targetId = getTargetId(interaction);
  if (!targetId) return;
  const name = getUsernameFromInteraction({ interaction, userId: targetId });
  return await getOrCreatePlayer({ id: targetId, name, guildId });
};
