import { bot } from "~/bot/index.ts";
import type { Emoji } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

export function rollDie({
  sides,
  random,
}: {
  sides: number;
  random: () => number;
}) {
  return Math.floor(random() * sides) + 1;
}

async function getRollEmoji({
  sides,
  roll,
}: {
  sides: number;
  roll: number;
}): Promise<string> {
  const name = `d${sides}_${roll}`;
  try {
    const emojis = await bot.rest.runMethod<{ items: Emoji[] }>(
      bot.rest,
      "GET",
      `/applications/${bot.id}/emojis`,
    );
    const emoji = emojis.items.find((e) => e.name === name);
    if (emoji) return `<:${emoji.name}:${emoji.id}>`;
    console.log(`No emoji found for ${name}`);
  } catch (error) {
    console.error(`Error fetching emoji ${name} from application:`, error);
  }
  return "🎲";
}

export async function rollAttackWithMessage({
  attackSides,
  damageSides,
  attackLabel,
  damageLabel,
  ac,
  random,
}: {
  attackSides: number;
  damageSides: number;
  attackLabel: string;
  damageLabel: string;
  ac: number;
  random: () => number;
}) {
  // Roll attack
  const attackRoll = rollDie({ sides: attackSides, random });
  const attackEmoji = await getRollEmoji({
    sides: attackSides,
    roll: attackRoll,
  });

  // Determine if hit
  const hit = attackRoll >= ac;

  // Roll damage if hit
  let damageRoll = 0;
  let damageEmoji = "";
  if (hit) {
    damageRoll = rollDie({ sides: damageSides, random });
    damageEmoji = await getRollEmoji({
      sides: damageSides,
      roll: damageRoll,
    });
  }

  // Create grouped message
  const attackLine =
    `${attackEmoji} ${attackRoll} ${attackLabel} (vs AC ${ac})`;
  const damageLine = hit
    ? `${damageEmoji} ${damageRoll} ${damageLabel}`
    : "Miss!";
  const message = `${attackLine}\n${damageLine}`;

  return {
    attackRoll,
    attackEmoji,
    hit,
    damageRoll,
    damageEmoji,
    message,
  };
}

export async function combineDiceImages(
  { imagePaths }: { imagePaths: string[] },
): Promise<Uint8Array> {
  const images = await Promise.all(
    imagePaths.map(async (p) => Image.decode(await Deno.readFile(p))),
  );
  const width = images.reduce((sum: number, img: Image) => sum + img.width, 0);
  const height = Math.max(...images.map((img: Image) => img.height));
  const combined = new Image(width, height);
  let x = 0;
  for (const img of images) {
    combined.composite(img, x, 0);
    x += img.width;
  }
  return await combined.encode();
}

export async function composeDiceAndHealthbarImage(
  { imagePaths, healthBarImage }: {
    imagePaths: string[];
    healthBarImage: Uint8Array;
  },
): Promise<Uint8Array> {
  const diceImages = await Promise.all(
    imagePaths.map(async (p) => Image.decode(await Deno.readFile(p))),
  );

  // Scale dice images to 50% of original size
  const scaledDiceImages = await Promise.all(diceImages.map((img) => {
    const scaledWidth = Math.floor(img.width * 0.5);
    const scaledHeight = Math.floor(img.height * 0.5);
    return img.resize(scaledWidth, scaledHeight);
  }));

  const diceWidth = scaledDiceImages.reduce(
    (sum: number, img: Image) => sum + img.width,
    0,
  );
  const diceHeight = Math.max(
    ...scaledDiceImages.map((img: Image) => img.height),
  );
  const diceRow = new Image(diceWidth, diceHeight);
  let x = 0;
  for (const img of scaledDiceImages) {
    diceRow.composite(img, x, 0);
    x += img.width;
  }

  const healthBar = await Image.decode(healthBarImage);
  // Scale health bar to 5x its original size
  const scaledHealthBarWidth = healthBar.width * 5;
  const scaledHealthBarHeight = healthBar.height * 5;
  const scaledHealthBar = healthBar.resize(
    scaledHealthBarWidth,
    scaledHealthBarHeight,
  );

  const totalWidth = Math.max(diceWidth, scaledHealthBarWidth);
  const totalHeight = diceHeight + scaledHealthBarHeight;
  const combined = new Image(totalWidth, totalHeight);

  // Center the dice row horizontally
  const diceX = Math.floor((totalWidth - diceWidth) / 2);
  combined.composite(diceRow, diceX, 0);

  // Center the health bar horizontally and place it below the dice
  const healthBarX = Math.floor((totalWidth - scaledHealthBarWidth) / 2);
  combined.composite(scaledHealthBar, healthBarX, diceHeight);

  return await combined.encode();
}
