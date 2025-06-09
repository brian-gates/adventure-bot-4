import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { prisma } from "~/db/index.ts";
await load({ export: true });

const main = async () => {
  const deletedMaps = await prisma.map.deleteMany({});
  console.log(`Deleted ${deletedMaps.count} maps`);
};

main().then(() => Deno.exit(0));
