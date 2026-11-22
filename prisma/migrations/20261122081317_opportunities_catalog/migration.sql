-- CreateEnum
CREATE TYPE "OpportunityDirection" AS ENUM ('INTERNATIONAL_RELATIONS', 'ECONOMICS_FINANCE', 'LAW', 'REGIONAL_STUDIES', 'POLITICAL_SCIENCE', 'JOURNALISM_MEDIA', 'DATA_IT', 'LANGUAGES', 'HISTORY_CULTURE', 'ARTS', 'SPORT_HEALTH', 'SOCIAL_PROJECTS');

-- CreateEnum
CREATE TYPE "OpportunityFormat" AS ENUM ('OFFLINE', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "OpportunityCost" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "OpportunityApplicationKind" AS ENUM ('STANDARD', 'LATE_REQUEST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OpportunityType" ADD VALUE 'CASE_CHAMPIONSHIP';
ALTER TYPE "OpportunityType" ADD VALUE 'GRANT';
ALTER TYPE "OpportunityType" ADD VALUE 'EXCHANGE';
ALTER TYPE "OpportunityType" ADD VALUE 'CLUB';
ALTER TYPE "OpportunityType" ADD VALUE 'CULTURAL';
ALTER TYPE "OpportunityType" ADD VALUE 'SPORT';
ALTER TYPE "OpportunityType" ADD VALUE 'VOLUNTEERING';

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "allowLateRequests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowedFaculties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cost" "OpportunityCost" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "costNote" VARCHAR(200),
ADD COLUMN     "deliveryFormat" "OpportunityFormat" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "directions" "OpportunityDirection"[] DEFAULT ARRAY[]::"OpportunityDirection"[],
ADD COLUMN     "endsAt" TIMESTAMPTZ(3),
ADD COLUMN     "lateRequestsUntil" TIMESTAMP(3),
ADD COLUMN     "location" VARCHAR(160),
ADD COLUMN     "maxCourse" INTEGER,
ADD COLUMN     "minCourse" INTEGER,
ADD COLUMN     "shortDescription" VARCHAR(200) NOT NULL DEFAULT '',
ADD COLUMN     "startsAt" TIMESTAMPTZ(3),
ALTER COLUMN "requiredDocuments" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "OpportunityApplication" ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "kind" "OpportunityApplicationKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "lateReason" VARCHAR(1000);

-- CreateTable
CREATE TABLE "OpportunityBookmark" (
    "studentId" INTEGER NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityBookmark_pkey" PRIMARY KEY ("studentId","opportunityId")
);

-- CreateIndex
CREATE INDEX "OpportunityBookmark_opportunityId_idx" ON "OpportunityBookmark"("opportunityId");

-- CreateIndex
CREATE INDEX "Opportunity_status_type_deadline_idx" ON "Opportunity"("status", "type", "deadline");

-- AddForeignKey
ALTER TABLE "OpportunityBookmark" ADD CONSTRAINT "OpportunityBookmark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityBookmark" ADD CONSTRAINT "OpportunityBookmark_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
