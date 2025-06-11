/*
  Warnings:

  - You are about to drop the column `currentLocationId` on the `Map` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Map" DROP CONSTRAINT "Map_currentLocationId_fkey";

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "currentLocationId" TEXT;

-- AlterTable
ALTER TABLE "Map" DROP COLUMN "currentLocationId";
