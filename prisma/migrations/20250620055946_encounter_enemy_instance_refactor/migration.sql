/*
  Warnings:

  - You are about to drop the column `enemyId` on the `EncounterEnemy` table. All the data in the column will be lost.
  - You are about to drop the `Enemy` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `health` to the `EncounterEnemy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxHealth` to the `EncounterEnemy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `EncounterEnemy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EncounterEnemy" DROP CONSTRAINT "EncounterEnemy_enemyId_fkey";

-- AlterTable
ALTER TABLE "EncounterEnemy" DROP COLUMN "enemyId",
ADD COLUMN     "health" INTEGER NOT NULL,
ADD COLUMN     "maxHealth" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- DropTable
DROP TABLE "Enemy";
