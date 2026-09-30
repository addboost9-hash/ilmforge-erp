-- Payment corrections.
-- A mis-keyed fee receipt is voided and, for a correction, replaced by a new
-- row linked back to it. Nothing is deleted, so the ledger stays auditable.
--
-- All four columns are nullable with no default: existing payments are simply
-- "not voided", which is the correct reading of every row already recorded.
-- No data is rewritten and no column or table is dropped.

ALTER TABLE "FeePayment" ADD COLUMN "voidedAt"   TIMESTAMP(3);
ALTER TABLE "FeePayment" ADD COLUMN "voidedBy"   INTEGER;
ALTER TABLE "FeePayment" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "FeePayment" ADD COLUMN "replacesId" INTEGER;

-- One correction per payment: a receipt cannot be replaced twice.
CREATE UNIQUE INDEX "FeePayment_replacesId_key" ON "FeePayment"("replacesId");

-- Collection totals filter on voidedAt on every dashboard and report query.
CREATE INDEX "FeePayment_schoolId_voidedAt_idx" ON "FeePayment"("schoolId", "voidedAt");

-- Self-reference: the replacement points at the payment it supersedes.
ALTER TABLE "FeePayment"
  ADD CONSTRAINT "FeePayment_replacesId_fkey"
  FOREIGN KEY ("replacesId") REFERENCES "FeePayment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
