import type { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { bot } from "~/bot/index.ts";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
    { sides: 4, prefix: "d4" },
    { sides: 6, prefix: "d6" },
    { sides: 8, prefix: "d8" },
    { sides: 12, prefix: "d12" },
    { sides: 20, prefix: "d20" },
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
      const emojiName = `${diceType.prefix}_${value}`;
      const imagePath = join(
        "media/dice/emoji",
        `${diceType.prefix}_${value}.png`,
      );

      try {
        // Fetch existing emojis for the application
        const emojiListRes = await fetch(
          `https://discord.com/api/v10/applications/${bot.id}/emojis`,
          {
            headers: {
              "Authorization": `Bot ${bot.token}`,
            },
          },
        );
        const emojiListData = await emojiListRes.json();
        const EmojiArraySchema = z.object({
          items: z.array(z.object({ name: z.string(), id: z.string() })),
        });
        const parseResult = EmojiArraySchema.safeParse(emojiListData);
        if (!parseResult.success) {
          console.error(
            "[emoji-app] Unexpected emoji list response:",
            emojiListData,
          );
          throw new Error(
            "Failed to fetch emoji list or received unexpected response.",
          );
        }
        const emojis = parseResult.data.items;
        // Find emoji with the same name
        const existing = emojis.find((e) => e.name === emojiName);
        if (existing) {
          // Delete the existing emoji
          await fetch(
            `https://discord.com/api/v10/applications/${bot.id}/emojis/${existing.id}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bot ${bot.token}`,
              },
            },
          );
        }

        const imageData = await Deno.readFile(imagePath);
        const base64 = encodeBase64(imageData);
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
          const errorBody = await response.text();
          let errorJson;
          try {
            errorJson = JSON.parse(errorBody);
          } catch {
            errorJson = { raw: errorBody };
          }
          console.error(
            "Discord API error:",
            JSON.stringify(
              {
                status: response.status,
                statusText: response.statusText,
                error: errorJson,
              },
              null,
              2,
            ),
          );
          let errorMessage = "An unknown error occurred.";
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          failedEmojis.push(`${emojiName} (${errorMessage})`);
        } else {
          const newEmoji = await response.json();
          uploadedEmojis.push(`<:${newEmoji.name}:${newEmoji.id}>`);
        }
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
