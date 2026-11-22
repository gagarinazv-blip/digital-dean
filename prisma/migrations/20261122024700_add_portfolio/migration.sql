-- CreateEnum
CREATE TYPE "PortfolioCategory" AS ENUM ('VOLUNTEERING', 'SCIENCE', 'COMPETITION', 'SPORT', 'CREATIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "PortfolioSource" AS ENUM ('STUDENT', 'STAFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudentAuditAction" ADD VALUE 'PORTFOLIO_ITEM_CREATED';
ALTER TYPE "StudentAuditAction" ADD VALUE 'PORTFOLIO_ITEM_UPDATED';
ALTER TYPE "StudentAuditAction" ADD VALUE 'PORTFOLIO_ITEM_DELETED';
ALTER TYPE "StudentAuditAction" ADD VALUE 'PORTFOLIO_FILE_DOWNLOADED';

-- CreateTable
CREATE TABLE "PortfolioFolder" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "name" VARCHAR(60) NOT NULL,
    "normalizedName" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "folderId" INTEGER,
    "title" VARCHAR(120) NOT NULL,
    "category" "PortfolioCategory" NOT NULL DEFAULT 'OTHER',
    "eventName" VARCHAR(180),
    "eventDate" DATE,
    "role" VARCHAR(100),
    "description" VARCHAR(500),
    "storedName" VARCHAR(100) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "source" "PortfolioSource" NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioFolder_studentId_normalizedName_key" ON "PortfolioFolder"("studentId", "normalizedName");

-- CreateIndex
CREATE INDEX "PortfolioFolder_parentId_idx" ON "PortfolioFolder"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_storedName_key" ON "PortfolioItem"("storedName");

-- CreateIndex
CREATE INDEX "PortfolioItem_studentId_createdAt_idx" ON "PortfolioItem"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioItem_studentId_category_eventDate_idx" ON "PortfolioItem"("studentId", "category", "eventDate");

-- CreateIndex
CREATE INDEX "PortfolioItem_folderId_idx" ON "PortfolioItem"("folderId");

-- CreateIndex
CREATE INDEX "PortfolioItem_source_idx" ON "PortfolioItem"("source");

-- AddForeignKey
ALTER TABLE "PortfolioFolder" ADD CONSTRAINT "PortfolioFolder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioFolder" ADD CONSTRAINT "PortfolioFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PortfolioFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "PortfolioFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
