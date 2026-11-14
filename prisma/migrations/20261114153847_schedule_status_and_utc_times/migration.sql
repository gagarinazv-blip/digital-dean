-- CreateEnum
CREATE TYPE "ScheduleKind" AS ENUM ('LECTURE', 'SEMINAR', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PLANNED', 'RESCHEDULED', 'CANCELLED');

-- DropIndex
DROP INDEX "ScheduleItem_groupId_idx";

-- AlterTable
ALTER TABLE "ScheduleItem" ADD COLUMN     "endsAt" TIMESTAMPTZ(3),
ADD COLUMN     "kind" "ScheduleKind" NOT NULL DEFAULT 'LECTURE',
ADD COLUMN     "originalEndsAt" TIMESTAMPTZ(3),
ADD COLUMN     "originalRoom" TEXT,
ADD COLUMN     "originalStartsAt" TIMESTAMPTZ(3),
ADD COLUMN     "startsAt" TIMESTAMPTZ(3),
ADD COLUMN     "status" "ScheduleStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateIndex
CREATE INDEX "ScheduleItem_groupId_startsAt_idx" ON "ScheduleItem"("groupId", "startsAt");

-- Convert existing campus wall-clock dates and times to UTC instants.
UPDATE "ScheduleItem"
SET
    "startsAt" = ("date" + "startTime") AT TIME ZONE 'Europe/Moscow',
    "endsAt" = ("date" + "endTime") AT TIME ZONE 'Europe/Moscow'
WHERE "date" IS NOT NULL;

UPDATE "ScheduleItem"
SET "status" = 'RESCHEDULED'
WHERE "isRescheduled" = true;
