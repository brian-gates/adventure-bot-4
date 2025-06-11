-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
