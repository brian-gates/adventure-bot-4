/*
  Warnings:

  - You are about to drop the column `currentLocationId` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `channelId` on the `Location` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[channelId]` on the table `Map` will be added. If there are existing duplicate values, this will fail.
  - Made the column `mapId` on table `Location` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mapId` on table `Path` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Guild" DROP CONSTRAINT "Guild_currentLocationId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_mapId_fkey";

-- DropForeignKey
ALTER TABLE "Path" DROP CONSTRAINT "Path_mapId_fkey";

-- AlterTable
ALTER TABLE "Guild" DROP COLUMN "currentLocationId",
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "mapId" TEXT;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "channelId",
ALTER COLUMN "mapId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "currentLocationId" TEXT,
ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Path" ALTER COLUMN "mapId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Map_channelId_key" ON "Map"("channelId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Path" ADD CONSTRAINT "Path_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Map" ADD CONSTRAINT "Map_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Map" ADD CONSTRAINT "Map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
