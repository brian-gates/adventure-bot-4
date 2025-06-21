/*
  Warnings:

  - You are about to drop the `EncounterEnemy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EncounterPlayer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[locationId]` on the table `Encounter` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `locationId` to the `Encounter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guildId` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EncounterEnemy" DROP CONSTRAINT "EncounterEnemy_encounterId_fkey";

-- DropForeignKey
ALTER TABLE "EncounterPlayer" DROP CONSTRAINT "EncounterPlayer_encounterId_fkey";

-- DropForeignKey
ALTER TABLE "EncounterPlayer" DROP CONSTRAINT "EncounterPlayer_playerId_fkey";

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN     "locationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "guildId" BIGINT NOT NULL,
ADD COLUMN     "initiative" INTEGER;

-- DropTable
DROP TABLE "EncounterEnemy";

-- DropTable
DROP TABLE "EncounterPlayer";

-- CreateTable
CREATE TABLE "Enemy" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHealth" INTEGER NOT NULL,
    "health" INTEGER NOT NULL,
    "initiative" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enemy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_locationId_key" ON "Encounter"("locationId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enemy" ADD CONSTRAINT "Enemy_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
