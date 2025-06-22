-- DropForeignKey
ALTER TABLE "Encounter" DROP CONSTRAINT "Encounter_locationId_fkey";

-- DropForeignKey
ALTER TABLE "Enemy" DROP CONSTRAINT "Enemy_encounterId_fkey";

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enemy" ADD CONSTRAINT "Enemy_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
