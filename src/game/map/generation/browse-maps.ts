import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { Keypress } from "https://deno.land/x/cliffy@v1.0.0-rc.4/keypress/mod.ts";
import { prisma } from "~/db/index.ts";
import { rasterizeSvgToPng, renderMapSvg } from "~/game/actions/map.ts";
import { seedMapForGuild } from "~/game/map/seed-map.ts";
import { asciiMapString } from "./log-ascii-map.ts";

await load({ export: true });

let maps = await prisma.map.findMany({
  include: {
    locations: true,
    paths: true,
    guild: true,
  },
});

let index = 0;

function render(message?: string) {
  console.clear();
  const map = maps[index];
  if (!map) {
    console.log("No maps found in the database.");
  } else {
    console.log(
      `Map ${
        index + 1
      }/${maps.length} (id: ${map.id}, guildId: ${map.guild?.id})`,
    );

    console.log(asciiMapString({ map }));
  }
  if (message) console.log("\n" + message);
  console.log(
    "\n←/→: prev/next map, R: reseed/regenerate, N: seed new map, S: save SVG, Q: quit",
  );
}

render();

async function promptSeed(): Promise<string | undefined> {
  console.log("Enter new seed (or leave blank to cancel): ");
  const buf = new Uint8Array(256);
  const n = <number> await Deno.stdin.read(buf);
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
      await prisma.map.deleteMany({ where: { id: map.id } });
      const guild = await prisma.guild.findUnique({ where: { mapId: map.id } });
      if (!guild) {
        render("No guild found for map.");
        continue;
      }
      await prisma.guild.update({
        where: { id: guild.id },
        data: { seed: newSeed },
      });
      await seedMapForGuild({ id: guild.id });
      maps = await prisma.map.findMany({
        include: { locations: true, paths: true, guild: true },
      });
      render("Map reseeded and regenerated.");
    } catch (err) {
      render("Error reseeding/regenerating: " + err);
    }
  } else if (key.key === "n") {
    console.log("Enter guild id for new map: ");
    const buf = new Uint8Array(256);
    const n = <number> await Deno.stdin.read(buf);
    if (!n) {
      render("No guild id entered.");
      continue;
    }
    const guildId = new TextDecoder().decode(buf.subarray(0, n)).trim();
    if (!guildId) {
      render("No guild id entered.");
      continue;
    }
    try {
      await seedMapForGuild({ id: BigInt(guildId) });
      maps = await prisma.map.findMany({
        include: { locations: true, paths: true, guild: true },
      });
      render(`Seeded new map for guild ${guildId}.`);
    } catch (err) {
      render("Error seeding new map: " + err);
    }
  } else if (key.key === "s") {
    const map = maps[index];
    if (!map) {
      render("No map to save.");
      continue;
    }
    try {
      const svg = renderMapSvg(map);
      const fileName = `map-${map.id}.svg`;
      await Deno.writeTextFile(fileName, svg);
      const png = await rasterizeSvgToPng(svg);
      const pngFileName = `map-${map.id}.png`;
      await Deno.writeFile(pngFileName, png);
      render(`SVG saved to ${fileName}, PNG saved to ${pngFileName}`);
    } catch (err) {
      render("Error saving SVG/PNG: " + err);
    }
  } else if (key.key === "q" || key.sequence === "\u0003") {
    Deno.exit(0);
  }
}
