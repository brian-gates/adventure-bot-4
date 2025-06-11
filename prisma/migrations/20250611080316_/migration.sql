/*
  Warnings:

  - You are about to drop the column `locationId` on the `Map` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mapId]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[guildId]` on the table `Map` will be added. If there are existing duplicate values, this will fail.
  - Made the column `mapId` on table `Path` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Guild" DROP CONSTRAINT "Guild_mapId_fkey";

-- DropForeignKey
ALTER TABLE "Map" DROP CONSTRAINT "Map_locationId_fkey";

-- AlterTable
ALTER TABLE "Map" DROP COLUMN "locationId",
ADD COLUMN     "guildId" BIGINT;

-- AlterTable
ALTER TABLE "Path" ALTER COLUMN "mapId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Location_mapId_key" ON "Location"("mapId");

-- CreateIndex
CREATE UNIQUE INDEX "Map_guildId_key" ON "Map"("guildId");

-- AddForeignKey
ALTER TABLE "Map" ADD CONSTRAINT "Map_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;
