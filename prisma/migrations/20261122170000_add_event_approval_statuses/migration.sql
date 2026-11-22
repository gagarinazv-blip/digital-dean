-- CreateEnum
CREATE TYPE "EventApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "EventApprovalItem" AS ENUM ('SPEAKER', 'ROOM', 'TIME');

-- CreateEnum
CREATE TYPE "EventHistoryAction" AS ENUM ('APPROVAL_STATUS_CHANGED', 'NOTE_CHANGED', 'PUBLICATION_CHANGED', 'MIGRATED');

-- DropIndex
DROP INDEX "Event_startsAt_status_idx";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "eventDate" DATE,
ADD COLUMN     "roomApproval" "EventApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "roomApprovalNote" VARCHAR(200),
ADD COLUMN     "roomApprovedAt" TIMESTAMP(3),
ADD COLUMN     "roomApprovedById" INTEGER,
ADD COLUMN     "speakerApproval" "EventApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "speakerApprovalNote" VARCHAR(200),
ADD COLUMN     "speakerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "speakerApprovedById" INTEGER,
ADD COLUMN     "timeApproval" "EventApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "timeApprovalNote" VARCHAR(200),
ADD COLUMN     "timeApprovedAt" TIMESTAMP(3),
ADD COLUMN     "timeApprovedById" INTEGER,
ALTER COLUMN "startsAt" DROP NOT NULL,
ALTER COLUMN "endsAt" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "host" DROP NOT NULL;

-- Backfill existing rows before making the calendar date mandatory.
UPDATE "Event"
SET
    "eventDate" = ("startsAt" AT TIME ZONE 'Europe/Moscow')::DATE,
    "speakerApproval" = CASE
        WHEN "status" = 'PUBLISHED' THEN 'APPROVED'::"EventApprovalStatus"
        ELSE 'PENDING'::"EventApprovalStatus"
    END,
    "roomApproval" = CASE
        WHEN "status" = 'PUBLISHED'
            OR ("location" IS NOT NULL AND btrim("location") <> '')
        THEN 'APPROVED'::"EventApprovalStatus"
        ELSE 'PENDING'::"EventApprovalStatus"
    END,
    "timeApproval" = CASE
        WHEN "status" = 'PUBLISHED'
            OR ("startsAt" IS NOT NULL AND "endsAt" IS NOT NULL)
        THEN 'APPROVED'::"EventApprovalStatus"
        ELSE 'PENDING'::"EventApprovalStatus"
    END;

ALTER TABLE "Event" ALTER COLUMN "eventDate" SET NOT NULL;

-- CreateTable
CREATE TABLE "EventApprovalHistory" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "action" "EventHistoryAction" NOT NULL,
    "item" "EventApprovalItem",
    "fromApprovalStatus" "EventApprovalStatus",
    "toApprovalStatus" "EventApprovalStatus",
    "fromEventStatus" "EventStatus",
    "toEventStatus" "EventStatus",
    "changedById" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- Record the status baseline without attributing old decisions to a staff user.
INSERT INTO "EventApprovalHistory"
    ("eventId", "action", "item", "toApprovalStatus", "changedAt")
SELECT "id", 'MIGRATED', 'SPEAKER', "speakerApproval", "updatedAt"
FROM "Event";

INSERT INTO "EventApprovalHistory"
    ("eventId", "action", "item", "toApprovalStatus", "changedAt")
SELECT "id", 'MIGRATED', 'ROOM', "roomApproval", "updatedAt"
FROM "Event";

INSERT INTO "EventApprovalHistory"
    ("eventId", "action", "item", "toApprovalStatus", "changedAt")
SELECT "id", 'MIGRATED', 'TIME', "timeApproval", "updatedAt"
FROM "Event";

INSERT INTO "EventApprovalHistory"
    ("eventId", "action", "fromEventStatus", "toEventStatus", "changedAt")
SELECT "id", 'MIGRATED', NULL, "status", "updatedAt"
FROM "Event";

-- CreateIndex
CREATE INDEX "EventApprovalHistory_eventId_changedAt_idx" ON "EventApprovalHistory"("eventId", "changedAt");

-- CreateIndex
CREATE INDEX "EventApprovalHistory_changedById_changedAt_idx" ON "EventApprovalHistory"("changedById", "changedAt");

-- CreateIndex
CREATE INDEX "Event_eventDate_status_idx" ON "Event"("eventDate", "status");

-- CreateIndex
CREATE INDEX "Event_speakerApprovedById_idx" ON "Event"("speakerApprovedById");

-- CreateIndex
CREATE INDEX "Event_roomApprovedById_idx" ON "Event"("roomApprovedById");

-- CreateIndex
CREATE INDEX "Event_timeApprovedById_idx" ON "Event"("timeApprovedById");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_speakerApprovedById_fkey" FOREIGN KEY ("speakerApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_roomApprovedById_fkey" FOREIGN KEY ("roomApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_timeApprovedById_fkey" FOREIGN KEY ("timeApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApprovalHistory" ADD CONSTRAINT "EventApprovalHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApprovalHistory" ADD CONSTRAINT "EventApprovalHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_timeApproval_not_required_check"
CHECK ("timeApproval" <> 'NOT_REQUIRED');
