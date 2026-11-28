-- Machines of any make: how each one sends its punches. Additive only.
ALTER TABLE "BiometricDevice" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'zkteco';
