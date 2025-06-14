/*
  Warnings:

  - You are about to drop the column `lastTarget` on the `Player` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Player_lastTarget_idx";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "lastTarget",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
