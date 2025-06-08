/*
  Warnings:

  - You are about to drop the column `channelId` on the `Path` table. All the data in the column will be lost.
  - Added the required column `cols` to the `Map` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rows` to the `Map` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "cols" INTEGER NOT NULL,
ADD COLUMN     "rows" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Path" DROP COLUMN "channelId";
