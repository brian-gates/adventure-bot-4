/*
  Warnings:

  - The `damageDice` column on the `Gear` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DamageDice" AS ENUM ('none', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20');

-- AlterTable
ALTER TABLE "Gear" DROP COLUMN "damageDice",
ADD COLUMN     "damageDice" "DamageDice" DEFAULT 'none';
