-- Exam roll numbers (seat numbers), fixed when an exam's slips are first
-- printed.
--
-- A new table: nothing existing changes. Exams that have no rows here keep
-- working as before (their numbers are worked out when the slips are shown,
-- and saved here when they are printed).
--
-- Additive only: no DROP, no rewrite of existing rows.

-- CreateTable
CREATE TABLE "ExamRollNumber" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "rollNo" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'exam',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamRollNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamRollNumber_examId_studentId_key" ON "ExamRollNumber"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamRollNumber_examId_number_key" ON "ExamRollNumber"("examId", "number");

-- CreateIndex
CREATE INDEX "ExamRollNumber_schoolId_examId_idx" ON "ExamRollNumber"("schoolId", "examId");
