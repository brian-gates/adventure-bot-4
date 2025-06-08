import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { prisma } from "~/db/index.ts";
import { asciiMapString } from "./log-ascii-map.ts";

await load({ export: true });

let maps = await prisma.map.findMany({
  include: {
    locations: true,
    paths: true,
  },
});

let index = 0;

function render(message?: string) {
  console.clear();
  const map = maps[index];
  if (!map) {
    console.log("No maps found in the database.");
    return;
  }
  console.log(
    `Map ${index + 1}/${maps.length} (id: ${map.id}, channelId: ${
      map.channelId
    })`
  );
  console.log(asciiMapString({ map }));
  if (message) console.log("\n" + message);
  console.log("\n←/→: prev/next map, R: reseed/regenerate, Q: quit");
}

render();

async function promptSeed(): Promise<string | undefined> {
  console.log("Enter new seed (or leave blank to cancel): ");
  const buf = new Uint8Array(256);
  const n = <number>await Deno.stdin.read(buf);
  if (!n) return undefined;
  const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
  return input || undefined;
}

for await (const key of new Keypress()) {
  if (key.key === "right") {
    index = (index + 1) % maps.length;
    render();
  } else if (key.key === "left") {
    index = (index - 1 + maps.length) % maps.length;
    render();
  } else if (key.key === "r") {
    const map = maps[index];
    if (!map) continue;
    const newSeed = await promptSeed();
    if (!newSeed) {
      render("Reseed cancelled.");
      continue;
    }
    try {
      await prisma.map.delete({ where: { id: map.id } });
      // Assume you have a function to regenerate the map for a given mapId and seed
      const { seedMapForGuild } = await import("~/game/map/seed-map.ts");
      await seedMapForGuild({ guildId: map.channelId });
      // Reload maps from DB
      maps = await prisma.map.findMany({
        include: { locations: true, paths: true },
      });
      render("Map reseeded and regenerated.");
    } catch (err) {
      render("Error reseeding/regenerating: " + err);
    }
  } else if (key.key === "q" || key.sequence === "\u0003") {
    Deno.exit(0);
  }
}
