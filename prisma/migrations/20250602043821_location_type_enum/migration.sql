-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('combat', 'event', 'elite', 'tavern', 'treasure');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "type" "NodeType" NOT NULL DEFAULT 'combat';
