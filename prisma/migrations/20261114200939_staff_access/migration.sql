-- Map existing request states before removing the old enum values.
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'READY', 'REJECTED');
ALTER TABLE "public"."Request" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Request"
  ALTER COLUMN "status" TYPE "RequestStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'NEW'
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
      WHEN 'APPROVED' THEN 'READY'
      WHEN 'REJECTED' THEN 'REJECTED'
    END::"RequestStatus_new"
  );
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "public"."RequestStatus_old";
ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- Preserve old employee accounts as STAFF, without inventing their profiles.
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('STUDENT', 'STAFF');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role"::text = 'STUDENT' THEN 'STUDENT'
      ELSE 'STAFF'
    END::"UserRole_new"
  );
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
COMMIT;

ALTER TABLE "Request" ADD COLUMN "assignedToId" INTEGER;

CREATE TABLE "StaffProfile" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "fullName" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");
CREATE INDEX "Request_assignedToId_idx" ON "Request"("assignedToId");

ALTER TABLE "StaffProfile"
  ADD CONSTRAINT "StaffProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Request"
  ADD CONSTRAINT "Request_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "StaffProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
