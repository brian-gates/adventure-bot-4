import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { prisma } from "~/db/index.ts";
await load({ export: true });

const main = async () => {
  const deletedPaths = await prisma.path.deleteMany({});
  const deletedLocations = await prisma.location.deleteMany({});
  console.log(
    `Deleted ${deletedPaths.count} paths and ${deletedLocations.count} locations (all guilds)`
  );
};

main().then(() => Deno.exit(0));
