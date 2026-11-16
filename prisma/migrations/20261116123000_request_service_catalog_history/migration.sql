ALTER TYPE "RequestStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "Request"
ADD COLUMN "catalogCode" TEXT,
ADD COLUMN "formFields" JSONB,
ADD COLUMN "profileSnapshot" JSONB,
ADD COLUMN "publicId" TEXT;

UPDATE "Request"
SET "publicId" = gen_random_uuid()::text
WHERE "publicId" IS NULL;

ALTER TABLE "Request"
ALTER COLUMN "publicId" SET NOT NULL;

CREATE TABLE "RequestStatusHistory" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorUserId" INTEGER,
    "comment" TEXT,

    CONSTRAINT "RequestStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RequestStatusHistory_requestId_changedAt_idx"
ON "RequestStatusHistory"("requestId", "changedAt");

CREATE INDEX "RequestStatusHistory_authorUserId_idx"
ON "RequestStatusHistory"("authorUserId");

CREATE UNIQUE INDEX "Request_publicId_key" ON "Request"("publicId");

ALTER TABLE "RequestStatusHistory"
ADD CONSTRAINT "RequestStatusHistory_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "Request"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequestStatusHistory"
ADD CONSTRAINT "RequestStatusHistory_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "RequestStatusHistory" (
    "requestId",
    "status",
    "changedAt",
    "authorUserId",
    "comment"
)
SELECT
    "Request"."id",
    "Request"."status",
    "Request"."updatedAt",
    NULL,
    'Снимок текущего статуса при добавлении истории; прежние автор и время перехода не сохранены.'
FROM "Request";
