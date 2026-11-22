-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('COMPETITION', 'INTERNSHIP', 'CONFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpportunityApplicationStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StudentDocumentType" AS ENUM ('PASSPORT', 'SNILS', 'INSURANCE', 'CONTRACT', 'OTHER');

-- AlterEnum
ALTER TYPE "NotificationTargetType" ADD VALUE 'OPPORTUNITY_APPLICATION';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OPPORTUNITY_STATUS';

-- AlterEnum
ALTER TYPE "StaffNotificationType" ADD VALUE 'NEW_OPPORTUNITY_APPLICATION';

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "documentType" "StudentDocumentType" NOT NULL DEFAULT 'OTHER',
    "storedName" VARCHAR(100) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "organizer" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "officialUrl" VARCHAR(2048),
    "eventDate" TIMESTAMP(3),
    "format" VARCHAR(100),
    "requiredDocuments" JSONB NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityApplication" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "status" "OpportunityApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "motivation" VARCHAR(2000),
    "studentSnapshot" JSONB NOT NULL,
    "staffComment" VARCHAR(2000),
    "decidedById" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFile" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "requirementKey" VARCHAR(80) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "storedName" VARCHAR(100) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "ApplicationFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocument_storedName_key" ON "StudentDocument"("storedName");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_createdAt_idx" ON "StudentDocument"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_documentType_idx" ON "StudentDocument"("studentId", "documentType");

-- CreateIndex
CREATE INDEX "Opportunity_status_deadline_idx" ON "Opportunity"("status", "deadline");

-- CreateIndex
CREATE INDEX "Opportunity_createdById_idx" ON "Opportunity"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityApplication_publicId_key" ON "OpportunityApplication"("publicId");

-- CreateIndex
CREATE INDEX "OpportunityApplication_studentId_submittedAt_idx" ON "OpportunityApplication"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "OpportunityApplication_opportunityId_status_idx" ON "OpportunityApplication"("opportunityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationFile_storedName_key" ON "ApplicationFile"("storedName");

-- CreateIndex
CREATE INDEX "ApplicationFile_applicationId_idx" ON "ApplicationFile"("applicationId");

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFile" ADD CONSTRAINT "ApplicationFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OpportunityApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
