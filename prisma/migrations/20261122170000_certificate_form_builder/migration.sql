-- CreateEnum
CREATE TYPE "CertificateFormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CertificateDeliveryMethod" AS ENUM ('ELECTRONIC', 'DEAN_OFFICE');

-- CreateEnum
CREATE TYPE "CertificateFormAuditAction" AS ENUM ('CREATED', 'UPDATED', 'DUPLICATED', 'ACTIVATED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "RequestAttachment" ADD COLUMN "fieldKey" VARCHAR(40);

-- AlterTable
ALTER TABLE "CertificateForm"
    ADD COLUMN "deliveryMethods" "CertificateDeliveryMethod"[] DEFAULT ARRAY['ELECTRONIC']::"CertificateDeliveryMethod"[],
    ADD COLUMN "normalizedTitle" VARCHAR(160),
    ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "status" "CertificateFormStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN "template" VARCHAR(4000) NOT NULL DEFAULT '',
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Existing forms keep their visibility.
UPDATE "CertificateForm"
SET "status" = CASE WHEN "active" THEN 'ACTIVE' ELSE 'ARCHIVED' END::"CertificateFormStatus";

-- Existing titles were not required to be unique: repeated ones get an id suffix.
UPDATE "CertificateForm" AS form
SET "normalizedTitle" = LOWER(REGEXP_REPLACE(BTRIM(form."title"), '\s+', ' ', 'g'))
    || CASE WHEN numbered."position" > 1 THEN ' #' || form."id" ELSE '' END
FROM (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(REGEXP_REPLACE(BTRIM("title"), '\s+', ' ', 'g'))
            ORDER BY "id"
        ) AS "position"
    FROM "CertificateForm"
) AS numbered
WHERE numbered."id" = form."id";

ALTER TABLE "CertificateForm" ALTER COLUMN "normalizedTitle" SET NOT NULL;

-- Requests submitted without a snapshot keep the schema they were created with.
UPDATE "Request" AS request
SET "formSchemaSnapshot" = jsonb_build_object(
    'code', form."code",
    'title', form."title",
    'description', form."description",
    'executionDays', form."executionDays",
    'requestType', request."type"::text,
    'fields', form."fields"
)
FROM "CertificateForm" AS form
WHERE request."catalogCode" = form."code"
  AND request."formSchemaSnapshot" IS NULL;

-- CreateTable
CREATE TABLE "CertificateFormAuditLog" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "actorUserId" INTEGER,
    "action" "CertificateFormAuditAction" NOT NULL,
    "version" INTEGER NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateFormAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateFormAuditLog_formId_createdAt_idx" ON "CertificateFormAuditLog"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "CertificateFormAuditLog_actorUserId_createdAt_idx" ON "CertificateFormAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateForm_normalizedTitle_key" ON "CertificateForm"("normalizedTitle");

-- CreateIndex
CREATE INDEX "CertificateForm_status_sortOrder_idx" ON "CertificateForm"("status", "sortOrder");

-- AddForeignKey
ALTER TABLE "CertificateFormAuditLog" ADD CONSTRAINT "CertificateFormAuditLog_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CertificateForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateFormAuditLog" ADD CONSTRAINT "CertificateFormAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
