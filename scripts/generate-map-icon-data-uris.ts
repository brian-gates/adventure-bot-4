import { LocationType } from "~/game/assign-location-types.ts";

const icons: Record<LocationType, string> = {
  campfire: "campfire.png",
  combat: "goblin.png",
  elite: "devil-mask.png",
  boss: "skull-shield.png",
  tavern: "tavern-sign.png",
  treasure: "chest.png",
  event: "skull-shield.png",
};

const out: string[] = [];
out.push("export const locationTypeImage = {");
for (const [key, filename] of Object.entries(icons)) {
  const filePath = `media/map-icons/${filename}`;
  const data = await Deno.readFile(filePath);
  const base64 = btoa(String.fromCharCode(...data));
  out.push(`  ${key}: \"data:image/png;base64,${base64}\",`);
}
out.push("} as const;");

await Deno.writeTextFile("src/game/location-type-image.ts", out.join("\n"));
console.log("Wrote src/game/location-type-image.ts");
