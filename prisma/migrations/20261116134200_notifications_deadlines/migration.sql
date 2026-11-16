CREATE TYPE "NotificationType" AS ENUM (
    'SCHEDULE_CHANGE',
    'DEADLINE',
    'REQUEST_STATUS'
);

CREATE TYPE "NotificationTargetType" AS ENUM (
    'SCHEDULE_ITEM',
    'DEADLINE',
    'REQUEST'
);

CREATE TYPE "DeadlineStatus" AS ENUM ('OPEN', 'SUBMITTED');

ALTER TABLE "Notification"
ADD COLUMN "publicId" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "type" "NotificationType",
ADD COLUMN "targetType" "NotificationTargetType",
ADD COLUMN "targetId" TEXT;

UPDATE "Notification"
SET
    "publicId" = gen_random_uuid()::text,
    "createdAt" = "date"
WHERE "publicId" IS NULL;

ALTER TABLE "Notification"
ALTER COLUMN "publicId" SET NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET NOT NULL;

CREATE UNIQUE INDEX "Notification_publicId_key"
ON "Notification"("publicId");

CREATE INDEX "Notification_studentId_type_readAt_createdAt_idx"
ON "Notification"("studentId", "type", "readAt", "createdAt");

CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deadline_studentId_status_dueAt_idx"
ON "Deadline"("studentId", "status", "dueAt");

ALTER TABLE "Deadline"
ADD CONSTRAINT "Deadline_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
