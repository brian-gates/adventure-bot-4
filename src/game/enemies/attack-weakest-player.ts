import { prisma } from "../../db/index.ts";
import { setPlayerHealth } from "../../db/player.ts";
import type {
  Encounter,
  Enemy,
  Player,
} from "../../generated/prisma/client.ts";
import { checkEncounterStatus } from "../check-encounter-status.ts";
import { rollAndAnnounceDie } from "../dice.ts";

export async function attackWeakestPlayer({
  random,
  attacker,
  channelId,
  guildId,
  encounter,
}: {
  channelId: bigint;
  guildId: bigint;
  random: () => number;
  encounter: Encounter;
  attacker: Enemy | Player;
}) {
  const weakestPlayer = await prisma.encounterPlayer.findFirst({
    where: { encounterId: encounter.id },
    orderBy: {
      player: {
        health: "asc",
      },
    },
    include: {
      player: true,
    },
  });

  if (!weakestPlayer) {
    return;
  }

  const { roll: attack } = await rollAndAnnounceDie({
    channelId,
    guildId,
    sides: 20,
    label: "attack",
    random,
  });

  const hit = attack > 10; // Simple AC 10 for now

  if (!hit) {
    const { bot } = await import("~/bot/index.ts");
    await bot.helpers.sendMessage(channelId, {
      content: `${attacker.name} misses ${weakestPlayer.player.name}!`,
    });
    return;
  }

  const { roll: damage } = await rollAndAnnounceDie({
    channelId,
    guildId,
    sides: 4,
    label: "1d4 (unarmed)",
    random,
  });

  const newHealth = Math.max(0, weakestPlayer.player.health - damage);

  await setPlayerHealth({
    id: weakestPlayer.player.id,
    health: newHealth,
    channelId,
    damageAmount: damage,
  });

  await checkEncounterStatus(encounter, channelId);
}
