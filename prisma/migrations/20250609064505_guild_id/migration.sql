/*
  Warnings:

  - The primary key for the `Guild` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `guildId` on the `Guild` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `guildId` on the `Map` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Guild" DROP CONSTRAINT "Guild_pkey",
DROP COLUMN "guildId",
ADD COLUMN     "guildId" BIGINT NOT NULL,
ADD CONSTRAINT "Guild_pkey" PRIMARY KEY ("guildId");

-- AlterTable
ALTER TABLE "Map" DROP COLUMN "guildId",
ADD COLUMN     "guildId" BIGINT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Map_guildId_key" ON "Map"("guildId");
