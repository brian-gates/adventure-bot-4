import { LocationType } from "~/generated/prisma/enums.ts";

const locationTypeIcon: Record<LocationType, string> = {
  combat: "⚔️",
  event: "❓",
  elite: "💀",
  tavern: "🏕️",
  treasure: "💰",
  boss: "👑",
  campfire: "🔥",
  shop: "🛒",
};

export { locationTypeIcon };
