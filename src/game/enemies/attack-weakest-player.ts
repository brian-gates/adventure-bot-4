import { prisma } from "~/db/index.ts";
import { narrate } from "~/llm/index.ts";
import { narrateCombatAction } from "~/prompts.ts";
import type { Encounter, Enemy, Player } from "~/generated/prisma/client.ts";
import { bot } from "~/bot/index.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";
import { checkEncounterStatus } from "../check-encounter-status.ts";
import { composeDiceAndHealthbarImage, rollDie } from "../dice.ts";

export async function attackWeakestPlayer({
  random,
  attacker,
  channelId,
  encounter,
}: {
  channelId: bigint;
  random: () => number;
  encounter: Encounter;
  attacker: Enemy | Player;
}) {
  const weakestPlayer = await prisma.player.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      health: "asc",
    },
  });

  if (!weakestPlayer) {
    return;
  }

  // Roll d20 for attack
  const attackRoll = rollDie({ sides: 20, random });
  const hit = attackRoll > 10; // Simple AC 10 for now
  const diceImagePaths = [`media/dice/output/d20_${attackRoll}.png`];
  let damage = 0;
  let newHealth = weakestPlayer.health;

  if (hit) {
    // Roll d4 for damage
    damage = rollDie({ sides: 4, random });
    diceImagePaths.push(`media/dice/output/d4_${damage}.png`);
    newHealth = Math.max(0, weakestPlayer.health - damage);
    // Update player health
    await prisma.player.update({
      where: { id: weakestPlayer.id },
      data: { health: newHealth },
    });
  }

  // Narrate the attack
  const prompt = narrateCombatAction({
    attacker: attacker.name,
    target: weakestPlayer.name,
    hit,
    damage,
    newHealth,
    maxHealth: weakestPlayer.maxHealth,
  });
  const narration = await narrate({ prompt });

  // Generate health bar image
  const healthBarImage = await getHealthBarImage({
    current: newHealth,
    max: weakestPlayer.maxHealth,
    damage: hit ? damage : undefined,
    label: weakestPlayer.name,
  });

  // Compose dice and health bar image
  const composedImage = await composeDiceAndHealthbarImage({
    imagePaths: diceImagePaths,
    healthBarImage,
  });
  const fileName = `enemy_attack_${attackRoll}${hit ? `_${damage}` : ""}.png`;

  // Use a public crossed swords image for the enemy avatar thumbnail
  const avatarUrl =
    "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/2694.png";

  // Send embed with narration and composed image
  await bot.helpers.sendMessage(channelId, {
    embeds: [
      {
        description: typeof narration === "string"
          ? narration
          : JSON.stringify(narration),
        image: { url: `attachment://${fileName}` },
        thumbnail: { url: avatarUrl },
      },
    ],
    file: {
      blob: new Blob([composedImage]),
      name: fileName,
    },
  });

  await checkEncounterStatus(encounter, channelId);
}
