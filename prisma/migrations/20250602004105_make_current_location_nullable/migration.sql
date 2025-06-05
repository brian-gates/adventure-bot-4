-- DropForeignKey
ALTER TABLE "GuildState" DROP CONSTRAINT "GuildState_currentLocationId_fkey";

-- AlterTable
ALTER TABLE "GuildState" ALTER COLUMN "currentLocationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GuildState" ADD CONSTRAINT "GuildState_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
