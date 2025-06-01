import { attackNarration } from "../dice.ts";

export function attack({
  validPlayers,
  target,
  ac,
  roll,
}: {
  validPlayers: { id: string; username: string; nick?: string }[];
  target: string | null;
  ac: number;
  roll: number;
}): string {
  if (
    !target ||
    !validPlayers.some(
      (p) => (p.nick ?? p.username).toLowerCase() === target.toLowerCase()
    )
  ) {
    return "You must mention a real player to attack!";
  }
  return attackNarration(roll, ac, target);
}
