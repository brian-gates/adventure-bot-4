import { db } from "./index.ts";

export async function getPlayer(id: string) {
  const result = await db.queryObject<{
    id: string;
    name: string;
    health: number;
  }>("SELECT * FROM players WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function setPlayerHealth(id: string, health: number) {
  await db.queryObject("UPDATE players SET health = $1 WHERE id = $2", [
    health,
    id,
  ]);
}

export async function createPlayer(id: string, name: string, health: number) {
  await db.queryObject(
    "INSERT INTO players (id, name, health) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
    [id, name, health]
  );
}
