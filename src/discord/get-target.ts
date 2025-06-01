import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { findOrCreatePlayer } from "~/db/player.ts";

export const getTargetId = ({ data }: Interaction) => {
  const value = data?.options?.find((opt) => opt.name === "target")?.value;
  return value != null ? String(value) : undefined;
};

export const getTargetPlayer = async ({
  interaction,
}: {
  interaction: Interaction;
}) => {
  const targetId = getTargetId(interaction);
  if (!targetId) return;
  const users = interaction.data?.resolved?.users as
    | Record<string, { username?: string }>
    | undefined;
  const name = users?.[targetId]?.username ?? targetId;
  return await findOrCreatePlayer({ id: targetId, name });
};
