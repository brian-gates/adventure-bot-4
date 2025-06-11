/*
  Warnings:

  - Made the column `currentLocationId` on table `Map` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Map" DROP CONSTRAINT "Map_currentLocationId_fkey";

-- AlterTable
ALTER TABLE "Map" ALTER COLUMN "currentLocationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Map" ADD CONSTRAINT "Map_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
