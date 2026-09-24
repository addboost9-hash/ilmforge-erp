-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "FeeInvoice" ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "TransportRoute" ADD COLUMN     "driverPhone" TEXT;

-- AlterTable
ALTER TABLE "ParentComplaint" ADD COLUMN     "adminReply" TEXT,
ADD COLUMN     "repliedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "details" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "createdBy" INTEGER,
ALTER COLUMN "duration" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "optionA" DROP NOT NULL,
ALTER COLUMN "optionB" DROP NOT NULL,
ALTER COLUMN "optionC" DROP NOT NULL,
ALTER COLUMN "optionD" DROP NOT NULL,
ALTER COLUMN "correctOption" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "classId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "remaining" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VisitorLog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "visitorName" TEXT NOT NULL,
    "phone" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'Meeting',
    "hostName" TEXT,
    "vehicleNo" TEXT,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkoutAt" TIMESTAMP(3),
    "recordedBy" INTEGER,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionLog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromClassId" INTEGER,
    "toClassId" INTEGER,
    "fromSectionId" INTEGER,
    "toSectionId" INTEGER,
    "fromSessionId" INTEGER,
    "newSessionId" INTEGER,
    "promotedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitorLog_schoolId_checkinAt_idx" ON "VisitorLog"("schoolId", "checkinAt");

-- CreateIndex
CREATE INDEX "VisitorLog_schoolId_checkoutAt_idx" ON "VisitorLog"("schoolId", "checkoutAt");

-- CreateIndex
CREATE INDEX "PromotionLog_schoolId_createdAt_idx" ON "PromotionLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionLog_schoolId_studentId_idx" ON "PromotionLog"("schoolId", "studentId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

