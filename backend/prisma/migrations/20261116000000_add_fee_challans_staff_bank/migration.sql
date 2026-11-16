-- Fee challans, and where staff salaries are sent through the bank.
--
-- FeeChallan: the slip a parent takes to the bank (or the school counter).
-- It lists the unpaid months as they stood when it was printed; the deposit
-- is recorded against its number. A new table: nothing existing changes.
--
-- Staff: three nullable columns for the account a salary is sent to.
-- Existing staff simply have none, so nothing needs backfilling.
--
-- Additive only: no DROP, no rewrite of existing rows.

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankAccountTitle" TEXT,
ADD COLUMN     "bankAccountNo" TEXT;

-- CreateTable
CREATE TABLE "FeeChallan" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "studentId" INTEGER NOT NULL,
    "challanNo" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "lateFee" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paidOn" TIMESTAMP(3),
    "bankRef" TEXT,
    "receiptNo" TEXT,
    "issuedBy" INTEGER,
    "recordedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeChallan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeChallan_schoolId_challanNo_key" ON "FeeChallan"("schoolId", "challanNo");

-- CreateIndex
CREATE INDEX "FeeChallan_schoolId_studentId_idx" ON "FeeChallan"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "FeeChallan_schoolId_status_idx" ON "FeeChallan"("schoolId", "status");
