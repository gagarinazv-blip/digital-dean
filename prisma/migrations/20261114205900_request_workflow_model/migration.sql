ALTER TYPE "RequestStatus" ADD VALUE 'NEEDS_INFO';

CREATE TYPE "RequestCommentVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

ALTER TABLE "StaffProfile"
ADD COLUMN "isSupervisor" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "RequestComment" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "authorUserId" INTEGER NOT NULL,
    "visibility" "RequestCommentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequestAttachment" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RequestComment_requestId_createdAt_idx"
ON "RequestComment"("requestId", "createdAt");

CREATE INDEX "RequestComment_authorUserId_idx"
ON "RequestComment"("authorUserId");

CREATE INDEX "RequestAttachment_commentId_idx"
ON "RequestAttachment"("commentId");

ALTER TABLE "RequestComment"
ADD CONSTRAINT "RequestComment_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "Request"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequestComment"
ADD CONSTRAINT "RequestComment_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequestAttachment"
ADD CONSTRAINT "RequestAttachment_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "RequestComment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
