const icons = {
  combat: "combat.png",
  elite: "elite.png",
  tavern: "tavern.png",
  treasure: "treasure.png",
};

const encodeIcon = async (key: keyof typeof icons, filename: string) => {
  const filePath = `media/map-icons/${filename}`;
  const data = await Deno.readFile(filePath);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  return `  ${key}: \"data:image/png;base64,${base64}\",`;
};

const main = async () => {
  const out = ["export const locationTypeImage = {"];
  for (const [key, filename] of Object.entries(icons) as [
    keyof typeof icons,
    string
  ][]) {
    out.push(await encodeIcon(key, filename));
  }
  out.push("} as const;");
  await Deno.writeTextFile(
    "src/game/map/locations/location-type-image.ts",
    out.join("\n")
  );
  console.log("Wrote src/game/map/locations/location-type-image.ts");
};

if (import.meta.main) main();
