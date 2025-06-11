/*
  Warnings:

  - You are about to drop the column `guildId` on the `Map` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mapId]` on the table `Guild` will be added. If there are existing duplicate values, this will fail.
  - Made the column `mapId` on table `Guild` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Guild" DROP CONSTRAINT "Guild_mapId_fkey";

-- DropIndex
DROP INDEX "Map_guildId_key";

-- AlterTable
ALTER TABLE "Guild" ALTER COLUMN "mapId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Map" DROP COLUMN "guildId";

-- CreateIndex
CREATE UNIQUE INDEX "Guild_mapId_key" ON "Guild"("mapId");

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
