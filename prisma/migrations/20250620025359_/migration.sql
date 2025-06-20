/*
  Warnings:

  - The `playerId` column on the `Encounter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `playerId` on the `EncounterPlayer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Player` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Encounter" DROP CONSTRAINT "Encounter_playerId_fkey";

-- DropForeignKey
ALTER TABLE "EncounterPlayer" DROP CONSTRAINT "EncounterPlayer_playerId_fkey";

-- AlterTable
ALTER TABLE "Encounter" DROP COLUMN "playerId",
ADD COLUMN     "playerId" BIGINT;

-- AlterTable
ALTER TABLE "EncounterPlayer" DROP COLUMN "playerId",
ADD COLUMN     "playerId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" BIGINT NOT NULL,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "EncounterPlayer_playerId_key" ON "EncounterPlayer"("playerId");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterPlayer" ADD CONSTRAINT "EncounterPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
