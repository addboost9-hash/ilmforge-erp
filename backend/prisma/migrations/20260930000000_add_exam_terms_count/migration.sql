-- Configurable number of exam terms per school.
--
-- Most schools run two terms, but some run up to six. The Exam Vault used to
-- render a hardcoded pair of tabs; it now renders one per configured term.
--
-- One column, NOT NULL with a default of 2, so every existing school keeps
-- exactly the two terms it has today and nothing needs backfilling.
-- Exam.term already stores a free-text label ("1st".."6th"), so no other
-- table changes.

ALTER TABLE "ExamSettings" ADD COLUMN "termsCount" INTEGER NOT NULL DEFAULT 2;
