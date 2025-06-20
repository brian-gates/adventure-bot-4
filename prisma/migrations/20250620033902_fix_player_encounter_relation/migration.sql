/*
  Warnings:

  - You are about to drop the column `playerId` on the `Encounter` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Encounter" DROP CONSTRAINT "Encounter_playerId_fkey";

-- DropIndex
DROP INDEX "EncounterPlayer_playerId_key";

-- AlterTable
ALTER TABLE "Encounter" DROP COLUMN "playerId";
