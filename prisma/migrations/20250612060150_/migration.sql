-- CreateEnum
CREATE TYPE "EncounterTurn" AS ENUM ('player', 'enemy');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('active', 'victory', 'defeat');

-- CreateTable
CREATE TABLE "Enemy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHealth" INTEGER NOT NULL,

    CONSTRAINT "Enemy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "turn" "EncounterTurn" NOT NULL,
    "status" "EncounterStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterPlayer" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "health" INTEGER NOT NULL,
    "maxHealth" INTEGER NOT NULL,

    CONSTRAINT "EncounterPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterEnemy" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "enemyId" TEXT NOT NULL,
    "health" INTEGER NOT NULL,

    CONSTRAINT "EncounterEnemy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncounterPlayer_playerId_key" ON "EncounterPlayer"("playerId");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterPlayer" ADD CONSTRAINT "EncounterPlayer_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterPlayer" ADD CONSTRAINT "EncounterPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterEnemy" ADD CONSTRAINT "EncounterEnemy_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterEnemy" ADD CONSTRAINT "EncounterEnemy_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "Enemy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
