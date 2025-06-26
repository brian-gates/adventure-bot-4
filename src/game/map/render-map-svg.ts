import {
  getContrastBg,
  HEIGHT,
  iconColors,
  WIDTH,
} from "~/game/actions/map.ts";
import { GameMap } from "~/game/map/game-map.ts";
import { locationTypeImage } from "~/game/map/locations/location-type-image.ts";
import type { Location } from "~/generated/prisma/client.ts";

export function renderMapSvg(map: GameMap) {
  const { locations, paths, cols, rows } = map;

  // Padding around the map
  const PAD_X = 40;
  const PAD_Y = 40;
  // Use cols/rows to scale node positions to SVG size
  const gridW = Math.max(1, (cols ?? 7) - 1);
  const gridH = Math.max(1, (rows ?? 15) - 1);
  const scaleX = (WIDTH - 2 * PAD_X) / gridW;
  const scaleY = (HEIGHT - 2 * PAD_Y) / gridH;
  const nodeRadius = Math.min(scaleX, scaleY) * 0.18;
  const iconSize = nodeRadius * 2 * 0.7;

  const nodePos = (loc: Location) => ({
    x: PAD_X + loc.col * scaleX,
    y: PAD_Y + (rows - 1 - loc.row) * scaleY,
  });

  let svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}'>`;
  for (const path of paths) {
    const from = locations.find((l) => l.id === path.fromLocationId);
    const to = locations.find((l) => l.id === path.toLocationId);
    if (from && to) {
      const { x: x1, y: y1 } = nodePos(from);
      const { x: x2, y: y2 } = nodePos(to);
      svg +=
        `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='#888' stroke-width='2'/>`;
    }
  }
  for (const loc of locations) {
    const { x, y } = nodePos(loc);
    const dominant = iconColors[loc.type as keyof typeof iconColors] ??
      "#00FF00";
    const bg = getContrastBg(dominant);
    const isCurrent = map.currentLocation && loc.id === map.currentLocation.id;
    const stroke = isCurrent ? "#FFD700" : dominant;
    const strokeWidth = isCurrent ? 4 : 2;
    svg +=
      `<circle cx='${x}' cy='${y}' r='${nodeRadius}' fill='${bg}' stroke='${stroke}' stroke-width='${strokeWidth}'/>`;
    const icon = locationTypeImage[loc.type];
    if (!icon) {
      console.warn(`Missing icon for node type: ${loc.type}`);
      svg +=
        `<text x="${x}" y="${y}" fill="#fff" font-size="10" text-anchor="middle" alignment-baseline="middle">${
          loc.type[0]
        }</text>`;
    } else {
      svg += `<image href='${icon}' x='${x - iconSize / 2}' y='${
        y - iconSize / 2
      }' width='${iconSize}' height='${iconSize}' />`;
    }
  }
  svg += `</svg>`;
  return svg;
}
