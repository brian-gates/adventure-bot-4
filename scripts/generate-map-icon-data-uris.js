const fs = require("node:fs");
const path = require("node:path");

const icons = {
  combat: "goblin.png",
  elite: "devil-mask.png",
  tavern: "tavern-sign.png",
  event: "skull-shield.png",
  treasure: "chest.png",
};

const out = [];
out.push("export const locationTypeImage = {");
for (const [key, filename] of Object.entries(icons)) {
  const filePath = path.join(process.cwd(), "media/map-icons/", filename);
  const data = fs.readFileSync(filePath);
  const base64 = data.toString("base64");
  out.push(`  ${key}: \"data:image/png;base64,${base64}\",`);
}
out.push("} as const;");

fs.writeFileSync(
  path.join(process.cwd(), "src/game/location-type-image.ts"),
  out.join("\n")
);
console.log("Wrote src/game/location-type-image.ts");
