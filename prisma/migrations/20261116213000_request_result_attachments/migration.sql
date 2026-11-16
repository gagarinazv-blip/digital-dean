CREATE TYPE "RequestAttachmentKind" AS ENUM ('REQUEST', 'RESULT');

ALTER TABLE "RequestAttachment"
ADD COLUMN "kind" "RequestAttachmentKind" NOT NULL DEFAULT 'REQUEST';
