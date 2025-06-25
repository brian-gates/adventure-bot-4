import { prisma } from "~/db/index.ts";
import type { Encounter, Player } from "~/generated/prisma/client.ts";
import { checkEncounterStatus } from "../check-encounter-status.ts";
import { narrate } from "~/llm/index.ts";
import { narrateCombatAction } from "~/prompts.ts";
import { getHealthBarImage } from "~/ui/health-bar.ts";
import { bot } from "~/bot/index.ts";
import { composeDiceAndHealthbarImage, rollDie } from "../dice.ts";

export type PlayerTemplate = {
  create: (ctx: {
    random: () => number;
    channelId: bigint;
  }) => {
    name: string;
    maxHealth: number;
    health: number;
    abilities: string[];
    act: (
      { encounter, self }: { encounter: Encounter; self: Player },
    ) => Promise<void>;
  };
};

export const basicPlayerTemplate: PlayerTemplate = {
  create: ({ random, channelId }) => ({
    name: "Basic Player",
    maxHealth: 10,
    health: 10,
    abilities: ["attack"],
    act: async ({ encounter, self }) => {
      await attackWeakestEnemy({
        random,
        channelId,
        encounter,
        attacker: self,
      });
    },
  }),
};

function getUserAvatarUrl(
  { id, avatar }: { id: string; avatar?: string | null },
) {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
  }
  const defaultAvatarNumber = Number(BigInt(id) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
}

async function attackWeakestEnemy({
  random,
  channelId,
  encounter,
  attacker,
}: {
  random: () => number;
  channelId: bigint;
  encounter: Encounter;
  attacker: Player;
}) {
  const weakestEnemy = await prisma.enemy.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      health: "asc",
    },
  });

  if (!weakestEnemy) {
    return;
  }

  // Roll d20 for attack
  const attackRoll = rollDie({ sides: 20, random });
  const hit = attackRoll > 10; // Simple AC 10 for now
  const diceImagePaths = [`media/dice/output/d20_${attackRoll}.png`];
  let damage = 0;
  let newHealth = weakestEnemy.health;

  if (hit) {
    // Roll d4 for damage
    damage = rollDie({ sides: 4, random });
    diceImagePaths.push(`media/dice/output/d4_${damage}.png`);
    newHealth = Math.max(0, weakestEnemy.health - damage);
    // Update enemy health
    await prisma.enemy.update({
      where: { id: weakestEnemy.id },
      data: { health: newHealth },
    });
  }

  // Narrate the attack
  const prompt = narrateCombatAction({
    attacker: attacker.name,
    target: weakestEnemy.name,
    hit,
    damage,
    newHealth,
    maxHealth: weakestEnemy.maxHealth,
  });
  const narration = await narrate({ prompt });

  // Generate health bar image
  const healthBarImage = await getHealthBarImage({
    current: newHealth,
    max: weakestEnemy.maxHealth,
    damage: hit ? damage : undefined,
    label: weakestEnemy.name,
  });

  // Compose dice and health bar image
  const composedImage = await composeDiceAndHealthbarImage({
    imagePaths: diceImagePaths,
    healthBarImage,
  });
  const fileName = `player_attack_${attackRoll}${hit ? `_${damage}` : ""}.png`;

  // Use the player's avatar if available, otherwise fallback
  const avatarUrl = getUserAvatarUrl({
    id: attacker.id.toString(),
    avatar: (attacker as any).avatar ?? undefined,
  });

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
