import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
await load({ export: true });

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { PrismaClient } from "~/generated/prisma/client.ts";

const dbUrl = Deno.env.get("DATABASE_URL")!;
export const db = new Client(dbUrl);

export async function connectDb() {
  await db.connect();
}

export const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
});
