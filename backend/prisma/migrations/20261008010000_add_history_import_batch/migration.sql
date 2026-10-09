-- Rows entered from a school's old records (Past Records import) carry the
-- import's id, so a mistaken import can be undone in one step.
ALTER TABLE "FeeInvoice" ADD COLUMN "importBatch" TEXT;
ALTER TABLE "FeePayment" ADD COLUMN "importBatch" TEXT;
ALTER TABLE "Expense" ADD COLUMN "importBatch" TEXT;
ALTER TABLE "SalaryRecord" ADD COLUMN "importBatch" TEXT;

CREATE INDEX "FeeInvoice_schoolId_importBatch_idx" ON "FeeInvoice"("schoolId", "importBatch");
CREATE INDEX "FeePayment_schoolId_importBatch_idx" ON "FeePayment"("schoolId", "importBatch");
CREATE INDEX "Expense_schoolId_importBatch_idx" ON "Expense"("schoolId", "importBatch");
CREATE INDEX "SalaryRecord_schoolId_importBatch_idx" ON "SalaryRecord"("schoolId", "importBatch");
