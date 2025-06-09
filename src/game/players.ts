export function inferTarget({
  target,
  validPlayers,
  authorId,
}: {
  target?: string | null;
  validPlayers: { id: string; username: string; nick?: string }[];
  authorId: string | bigint;
}) {
  if (target) {
    const found = validPlayers.find(
      (p) => (p.nick ?? p.username).toLowerCase() === target.toLowerCase(),
    );
    if (found) return found;
  }
  return authorId.toString();
}
