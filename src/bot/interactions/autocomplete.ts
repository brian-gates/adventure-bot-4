import {
  type Bot,
  type Interaction,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export async function handleAutocomplete(bot: Bot, interaction: Interaction) {
  if (
    interaction.type !== 4 ||
    (interaction.data?.name !== "attack" && interaction.data?.name !== "heal")
  ) {
    return;
  }

  const inputRaw = interaction.data.options?.[0]?.value;
  const input = typeof inputRaw === "string" ? inputRaw.toLowerCase() : "";
  const membersRaw = interaction.guildId
    ? await bot.helpers.getMembers(interaction.guildId, { limit: 1000 })
    : [];
  const members = Array.isArray(membersRaw)
    ? membersRaw
    : Array.from(membersRaw.values ? membersRaw.values() : []);
  const userChoices = members
    .filter((m) => m.user)
    .map((m) => ({
      name: m.nick ?? m.user!.username,
      value: m.user!.id.toString(),
    }));
  const allChoices = [...userChoices]
    .filter((choice) => choice.name.toLowerCase().includes(input))
    .slice(0, 25);
  await bot.helpers.sendInteractionResponse(
    interaction.id,
    interaction.token,
    {
      type: 8,
      data: { choices: allChoices },
    },
  );
}
