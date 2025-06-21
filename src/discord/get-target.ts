import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getPlayer } from "~/db/player.ts";

export const getTargetId = ({ data }: Interaction) => {
  const value = data?.options?.find((opt) => opt.name === "target")?.value;
  return value != null &&
      (typeof value === "string" || typeof value === "number")
    ? BigInt(value)
    : undefined;
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
  const users = interaction.data?.resolved?.users as
    | Record<string, { username?: string }>
    | undefined;
  const name = users?.[targetId.toString()]?.username ?? targetId.toString();
  return await getPlayer({ id: targetId, name, guildId });
};
