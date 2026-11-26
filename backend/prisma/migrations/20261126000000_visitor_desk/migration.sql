-- The Visitor Desk: visitors (one per CNIC), what each visit is about, kiosk
-- tablets, and parents' details waiting for approval. Additive only: new
-- tables, and new columns on VisitorLog with defaults for the rows already there.

-- AlterTable
ALTER TABLE "VisitorLog" ADD COLUMN     "checkedOutBy" INTEGER,
ADD COLUMN     "childName" TEXT,
ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "confirmedBy" INTEGER,
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "kioskData" TEXT,
ADD COLUMN     "linkId" INTEGER,
ADD COLUMN     "linkType" TEXT,
ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "passCode" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "relation" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'gate',
ADD COLUMN     "staffNotes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'in',
ADD COLUMN     "studentIds" TEXT,
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visitorId" INTEGER;

-- CreateTable
CREATE TABLE "Visitor" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cnic" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "photoUrl" TEXT,
    "cnicPhotoUrl" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KioskDevice" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdBy" INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KioskDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorRecordUpdate" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "fatherName" TEXT,
    "fatherCnic" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" INTEGER,
    "decidedBy" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorRecordUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visitor_schoolId_phone_idx" ON "Visitor"("schoolId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_schoolId_cnic_key" ON "Visitor"("schoolId", "cnic");

-- CreateIndex
CREATE UNIQUE INDEX "KioskDevice_tokenHash_key" ON "KioskDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "KioskDevice_schoolId_idx" ON "KioskDevice"("schoolId");

-- CreateIndex
CREATE INDEX "VisitorRecordUpdate_schoolId_status_idx" ON "VisitorRecordUpdate"("schoolId", "status");

-- CreateIndex
CREATE INDEX "VisitorRecordUpdate_schoolId_studentId_idx" ON "VisitorRecordUpdate"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "VisitorLog_schoolId_status_idx" ON "VisitorLog"("schoolId", "status");

-- CreateIndex
CREATE INDEX "VisitorLog_schoolId_visitorId_idx" ON "VisitorLog"("schoolId", "visitorId");

