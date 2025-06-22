import { prisma } from "~/db/index.ts";
import type { Prisma } from "~/generated/prisma/client.ts";

export type EncounterWithCombatants = Prisma.EncounterGetPayload<{
  include: { enemies: true; players: true };
}>;

export async function findOrCreateEncounter({
  locationId,
  status = "active",
}: {
  locationId: string;
  status?: "active" | "victory" | "defeat";
}): Promise<EncounterWithCombatants> {
  const encounter = await prisma.encounter.findUnique({
    where: { locationId },
    include: {
      enemies: true,
      players: true,
    },
  });

  if (encounter) {
    return encounter;
  }

  return await prisma.encounter.create({
    data: {
      locationId,
      status,
    },
    include: {
      enemies: true,
      players: true,
    },
  });
}
