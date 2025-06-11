/*
  Warnings:

  - You are about to drop the column `locationId` on the `Guild` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Guild" DROP CONSTRAINT "Guild_locationId_fkey";

-- AlterTable
ALTER TABLE "Guild" DROP COLUMN "locationId";

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
