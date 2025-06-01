// Database integration placeholder for Deno

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const dbUrl = Deno.env.get("DATABASE_URL")!;
export const db = new Client(dbUrl);

export async function connectDb() {
  await db.connect();
}
