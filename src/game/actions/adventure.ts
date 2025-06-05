import { Bot, Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { narrate } from "~/llm/index.ts";

export async function adventure({
  bot,
  interaction,
}: {
  bot: Bot;
  interaction: Interaction;
}) {
  if (!interaction.channelId) return;
  await bot.helpers.sendMessage(interaction.channelId, {
    content: await narrate({
      prompt: `Narrate a short, vivid fantasy adventure for <@${
        interaction.user?.id ?? interaction.member?.user?.id
      }> in a Discord RPG. Respond with a single immersive sentence.`,
    }),
  });
}
