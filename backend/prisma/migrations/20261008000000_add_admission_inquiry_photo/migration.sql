-- Student photo on an online admission application.
--
-- Parents can now attach the child's photo on the school's online admission
-- form (/s/<slug>/apply). It is shrunk in the browser to about 40 KB and
-- stored as a data URL, like Student.photoUrl, and copied to the student's
-- record when the office admits the application.
--
-- One nullable column: existing applications simply have no photo, so
-- nothing needs backfilling and no existing data is touched.

ALTER TABLE "AdmissionInquiry" ADD COLUMN "photoUrl" TEXT;
