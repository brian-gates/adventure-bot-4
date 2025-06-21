/*
  Warnings:

  - You are about to drop the column `health` on the `EncounterEnemy` table. All the data in the column will be lost.
  - You are about to drop the column `health` on the `EncounterPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `maxHealth` on the `EncounterPlayer` table. All the data in the column will be lost.
  - Added the required column `health` to the `Enemy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EncounterEnemy" DROP COLUMN "health";

-- AlterTable
ALTER TABLE "EncounterPlayer" DROP COLUMN "health",
DROP COLUMN "maxHealth";

-- AlterTable
ALTER TABLE "Enemy" ADD COLUMN     "health" INTEGER NOT NULL;
