-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "formSchemaSnapshot" JSONB;

-- CreateTable
CREATE TABLE "CertificateForm" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "executionDays" INTEGER NOT NULL,
    "fields" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateForm_code_key" ON "CertificateForm"("code");

-- CreateIndex
CREATE INDEX "CertificateForm_active_sortOrder_idx" ON "CertificateForm"("active", "sortOrder");

-- Preserve the existing static certificate catalog as editable database rows.
INSERT INTO "CertificateForm" (
    "code",
    "title",
    "description",
    "executionDays",
    "fields",
    "active",
    "sortOrder",
    "updatedAt"
)
VALUES
    (
        'STUDY_CERTIFICATE',
        'Справка об обучении',
        'Подтверждение факта обучения в учебном заведении.',
        5,
        '[{"id":"purpose","label":"Куда предоставляется / цель","kind":"text","required":true,"maxLength":300}]'::jsonb,
        true,
        10,
        CURRENT_TIMESTAMP
    ),
    (
        'CALL_CERTIFICATE',
        'Справка-вызов',
        'Справка для предоставления по месту работы на период аттестации.',
        7,
        '[{"id":"periodStart","label":"Начало периода","kind":"date","required":true},{"id":"periodEnd","label":"Окончание периода","kind":"date","required":true},{"id":"reason","label":"Причина вызова","kind":"select","required":true,"options":[{"value":"SESSION","label":"Промежуточная аттестация"},{"value":"STATE_EXAMS","label":"Государственная итоговая аттестация"},{"value":"OTHER","label":"Иная обязательная аттестация"}]}]'::jsonb,
        true,
        20,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("code") DO NOTHING;

-- Keep the field labels and validation rules attached to requests already submitted.
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
