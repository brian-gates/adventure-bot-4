/*
  Warnings:

  - Added the required column `col` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `row` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Location" ADD COLUMN "col" INTEGER,
ADD COLUMN "row" INTEGER;

UPDATE "Location" SET "col" = 0 WHERE "col" IS NULL;
UPDATE "Location" SET "row" = 0 WHERE "row" IS NULL;

ALTER TABLE "Location" ALTER COLUMN "col" SET NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "row" SET NOT NULL;
