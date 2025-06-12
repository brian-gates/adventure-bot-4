import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
await load({ export: true });

import { PrismaClient } from "~/generated/prisma/client.ts";

export const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
});
