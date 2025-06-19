import { prisma } from "~/db/index.ts";

const enemies = [
  { name: "goblin", maxHealth: 10 },
  { name: "orc", maxHealth: 18 },
  { name: "slime", maxHealth: 8 },
];

async function main() {
  for (const enemy of enemies) {
    const existing = await prisma.enemy.findFirst({
      where: { name: enemy.name },
    });
    if (existing) {
      await prisma.enemy.update({
        where: { id: existing.id },
        data: { maxHealth: enemy.maxHealth },
      });
    } else {
      await prisma.enemy.create({
        data: {
          name: enemy.name,
          maxHealth: enemy.maxHealth,
          health: enemy.maxHealth,
        },
      });
    }
  }
  console.log("Enemies seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    Deno.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
