-- Sign-ins end when the password changes.
--
-- tokenVersion is raised when a password is changed or reset; refresh tokens
-- carry the version they were issued with and stop working once it moves on,
-- so every other signed-in device is signed out. Existing accounts start at 0,
-- which is what their current tokens carry (none), so nobody is signed out
-- by this change itself.

ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
