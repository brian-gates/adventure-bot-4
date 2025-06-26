import { adventure } from "./adventure.ts";
import { attack } from "./attack.ts";
import { emoji } from "./emoji.ts";
import { heal } from "./heal.ts";
import { map } from "./map.ts";
import { rally } from "./rally.ts";
import { resetmap } from "./resetmap.ts";
import { setseed } from "./setseed.ts";
import { inspect } from "./inspect.ts";
import { equip } from "./equip.ts";
import { setHealth } from "./set-health.ts";

export const set = {
  health: setHealth,
  seed: setseed,
};

export const actions = {
  attack,
  heal,
  adventure,
  map,
  rally,
  resetmap,
  emoji,
  inspect,
  equip,
  set,
} as const;

export const isActionName = (name: string): name is keyof typeof actions => {
  return name in actions;
};
