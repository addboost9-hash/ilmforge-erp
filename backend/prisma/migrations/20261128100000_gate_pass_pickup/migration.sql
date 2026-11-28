-- Gate passes: who collects the student, as the office checked it. Additive only.
ALTER TABLE "GatePass" ADD COLUMN "relation" TEXT;
ALTER TABLE "GatePass" ADD COLUMN "pickupPhone" TEXT;
ALTER TABLE "GatePass" ADD COLUMN "pickupCnic" TEXT;
ALTER TABLE "GatePass" ADD COLUMN "onRecord" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GatePass" ADD COLUMN "parentConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GatePass" ADD COLUMN "usedBy" INTEGER;
