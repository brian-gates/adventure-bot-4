/*
  Warnings:

  - You are about to drop the `GuildState` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `Location` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('combat', 'event', 'elite', 'tavern', 'treasure', 'boss', 'campfire');

-- DropForeignKey
ALTER TABLE "GuildState" DROP CONSTRAINT "GuildState_currentLocationId_fkey";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "type",
ADD COLUMN     "type" "LocationType" NOT NULL;

-- DropTable
DROP TABLE "GuildState";

-- DropEnum
DROP TYPE "NodeType";

-- CreateTable
CREATE TABLE "Guild" (
    "guildId" TEXT NOT NULL,
    "currentLocationId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seed" TEXT NOT NULL,
    "randomCursor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("guildId")
);

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
