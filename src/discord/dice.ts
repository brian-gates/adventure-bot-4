export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

export function getDiceEmoji(roll: number): string {
  const num = roll.toString().padStart(2, "0");
  return `:d20_${num}:`;
}

export function attackNarration(
  roll: number,
  ac: number,
  target: string
): string {
  const delta = roll - ac;
  const dice = getDiceEmoji(roll);
  if (roll === 1) {
    return `${dice} Critical miss! You swing wildly and miss ${target} completely! (${roll} vs AC ${ac})`;
  }
  if (roll === 20) {
    return `${dice} Critical hit! You devastate ${target}! (${roll} vs AC ${ac})`;
  }
  if (roll < ac) {
    return `${dice} Your attack glances off ${target}. (${roll} vs AC ${ac})`;
  }
  if (roll === ac) {
    return `${dice} You barely manage to hit ${target}! (${roll} vs AC ${ac})`;
  }
  if (delta < 5) {
    return `${dice} You strike ${target} with a solid blow! (${roll} vs AC ${ac})`;
  }
  if (delta < 10) {
    return `${dice} A powerful hit! ${target} reels. (${roll} vs AC ${ac})`;
  }
  return `${dice} Overwhelming blow! ${target} is crushed! (${roll} vs AC ${ac})`;
}
