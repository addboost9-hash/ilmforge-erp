-- Fingerprint machines, organisation level: everyone on the machines by
-- their user number (PIN) and who it is, a backup of the fingerprints and
-- faces the machines upload, and the work waiting for each machine. Additive
-- only: new tables, and new nullable columns on BiometricDevice and
-- BiometricPunch.

-- AlterTable
ALTER TABLE "BiometricDevice" ADD COLUMN     "infoAt" TIMESTAMP(3),
ADD COLUMN     "infoJson" TEXT;

-- AlterTable
ALTER TABLE "BiometricPunch" ADD COLUMN     "pin" TEXT;

-- CreateTable
CREATE TABLE "BiometricUser" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "pin" TEXT NOT NULL,
    "machineName" TEXT,
    "personType" TEXT,
    "personId" INTEGER,
    "linkHow" TEXT,
    "linkedBy" INTEGER,
    "linkedAt" TIMESTAMP(3),
    "card" TEXT,
    "fingers" INTEGER NOT NULL DEFAULT 0,
    "faces" INTEGER NOT NULL DEFAULT 0,
    "onDevices" TEXT,
    "waiting" INTEGER NOT NULL DEFAULT 0,
    "lastPunchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricTemplate" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "pin" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'fp',
    "bioType" INTEGER,
    "majorVer" TEXT,
    "minorVer" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "valid" INTEGER NOT NULL DEFAULT 1,
    "data" TEXT NOT NULL,
    "deviceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCommand" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "job" TEXT NOT NULL,
    "cmd" TEXT NOT NULL,
    "pin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "result" INTEGER,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricUser_schoolId_personType_personId_idx" ON "BiometricUser"("schoolId", "personType", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricUser_schoolId_pin_key" ON "BiometricUser"("schoolId", "pin");

-- CreateIndex
CREATE INDEX "BiometricTemplate_schoolId_pin_idx" ON "BiometricTemplate"("schoolId", "pin");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricTemplate_schoolId_pin_kind_slot_key" ON "BiometricTemplate"("schoolId", "pin", "kind", "slot");

-- CreateIndex
CREATE INDEX "DeviceCommand_deviceId_status_idx" ON "DeviceCommand"("deviceId", "status");

-- CreateIndex
CREATE INDEX "DeviceCommand_schoolId_createdAt_idx" ON "DeviceCommand"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "BiometricPunch_schoolId_pin_idx" ON "BiometricPunch"("schoolId", "pin");

