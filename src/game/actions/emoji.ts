import type { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { bot } from "~/bot/index.ts";

/**
 * Uploads all dice images directly to the bot's application as emojis.
 * This is the preferred method as it bypasses server emoji limits.
 */
export async function emoji({
  interaction,
}: {
  interaction: Interaction;
}) {
  // Application emojis don't have a simple count check, so we start uploading.
  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    content:
      "🎲 **Uploading dice emojis to bot application...**\nThis may take a moment. These emojis will be available in any server the bot is in.",
  });

  const diceTypes = [
    { sides: 4, path: "media/dice/d4" },
    { sides: 6, path: "media/dice/d6" },
    { sides: 20, path: "media/dice/d20" },
  ];

  const uploadedEmojis: string[] = [];
  const failedEmojis: string[] = [];
  let totalProcessed = 0;
  const totalEmojis = diceTypes.reduce((sum, type) => sum + type.sides, 0);

  const updateMessage = async () => {
    const progress = Math.round((totalProcessed / totalEmojis) * 100);
    const progressBar = "█".repeat(Math.floor(progress / 10)) +
      "░".repeat(10 - Math.floor(progress / 10));

    let content = `🎲 **Application Emoji Upload**\n\n`;
    content += `Progress: ${progressBar} ${progress}%\n`;
    content += `Processed: ${totalProcessed}/${totalEmojis}\n\n`;

    if (uploadedEmojis.length > 0) {
      content += `✅ **Success:** ${uploadedEmojis.length} | ${
        uploadedEmojis.slice(-5).join(" ")
      }\n`;
    }
    if (failedEmojis.length > 0) {
      content += `❌ **Failed:** ${failedEmojis.length} | ${
        failedEmojis.slice(-3).join(", ")
      }\n`;
    }

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
      content,
    });
  };

  for (const diceType of diceTypes) {
    for (let value = 1; value <= diceType.sides; value++) {
      const emojiName = `d${diceType.sides}_${value}`;
      const imagePath = join(diceType.path, `${value}_tiny.png`);

      try {
        const imageData = await Deno.readFile(imagePath);
        const base64 = btoa(
          new Uint8Array(imageData).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        const dataUri = `data:image/png;base64,${base64}`;

        const response = await fetch(
          `https://discord.com/api/v10/applications/${bot.id}/emojis`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bot ${bot.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: emojiName,
              image: dataUri,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            `[${response.status}] ${error.message || "Failed to upload"}`,
          );
        }

        const newEmoji = await response.json();
        uploadedEmojis.push(`<:${newEmoji.name}:${newEmoji.id}>`);
      } catch (error) {
        console.error(`[emoji-app] Failed to upload ${emojiName}:`, error);
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        failedEmojis.push(`${emojiName} (${errorMessage})`);
      }

      totalProcessed++;
      await updateMessage();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate-limit delay
    }
  }

  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    content:
      `✅ **Application emoji upload complete!**\n\nSuccess: ${uploadedEmojis.length}\nFailed: ${failedEmojis.length}`,
  });
}
