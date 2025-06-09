/*
  Warnings:

  - You are about to drop the column `channelId` on the `Map` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[guildId]` on the table `Map` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildId` to the `Map` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Map_channelId_key";

-- AlterTable
ALTER TABLE "Map" DROP COLUMN "channelId",
ADD COLUMN     "guildId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Map_guildId_key" ON "Map"("guildId");
