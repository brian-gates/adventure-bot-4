/*
  Warnings:

  - You are about to drop the column `turn` on the `Encounter` table. All the data in the column will be lost.
  - Added the required column `initiative` to the `EncounterEnemy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initiative` to the `EncounterPlayer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Encounter" DROP COLUMN "turn";

-- AlterTable
ALTER TABLE "EncounterEnemy" ADD COLUMN     "initiative" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EncounterPlayer" ADD COLUMN     "initiative" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "EncounterTurn";
