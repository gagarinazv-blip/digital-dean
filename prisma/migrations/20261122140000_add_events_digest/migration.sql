CREATE TYPE "EventType" AS ENUM (
    'CONFERENCE',
    'SPEAKER_MEETING',
    'MASTER_CLASS',
    'OTHER'
);

CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "type" "EventType" NOT NULL,
    "description" VARCHAR(1000),
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "location" VARCHAR(160) NOT NULL,
    "host" VARCHAR(160) NOT NULL,
    "registrationUrl" VARCHAR(2048),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_startsAt_status_idx" ON "Event"("startsAt", "status");
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
