-- CreateEnum
CREATE TYPE "DeadlineFormat" AS ENUM ('ONLINE', 'OFFLINE', 'EXAM');

-- CreateEnum
CREATE TYPE "DeadlineMaterialKind" AS ENUM ('PDF', 'DOC', 'SLIDES', 'LINK', 'OTHER');

-- CreateEnum
CREATE TYPE "DeadlineMaterialUploaderRole" AS ENUM ('TEACHER', 'STAFF');

-- CreateEnum
CREATE TYPE "DeadlineProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "Deadline" ADD COLUMN     "criteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "disciplineId" TEXT,
ADD COLUMN     "format" "DeadlineFormat" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "taskUrl" TEXT,
ADD COLUMN     "topic" TEXT;

-- CreateTable
CREATE TABLE "DeadlineMaterial" (
    "id" TEXT NOT NULL,
    "deadlineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DeadlineMaterialKind" NOT NULL,
    "url" TEXT,
    "fileName" TEXT,
    "mediaType" TEXT,
    "sizeBytes" INTEGER,
    "data" BYTEA,
    "uploadedById" INTEGER,
    "uploadedByName" TEXT NOT NULL,
    "uploadedByRole" "DeadlineMaterialUploaderRole" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadlineMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineProgress" (
    "id" SERIAL NOT NULL,
    "deadlineId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "status" "DeadlineProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadlineProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeadlineMaterial_deadlineId_uploadedAt_idx" ON "DeadlineMaterial"("deadlineId", "uploadedAt");

-- CreateIndex
CREATE INDEX "DeadlineMaterial_uploadedById_idx" ON "DeadlineMaterial"("uploadedById");

-- CreateIndex
CREATE INDEX "DeadlineProgress_studentId_idx" ON "DeadlineProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "DeadlineProgress_deadlineId_studentId_key" ON "DeadlineProgress"("deadlineId", "studentId");

-- CreateIndex
CREATE INDEX "Deadline_disciplineId_idx" ON "Deadline"("disciplineId");

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "AcademicPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineMaterial" ADD CONSTRAINT "DeadlineMaterial_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineMaterial" ADD CONSTRAINT "DeadlineMaterial_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineProgress" ADD CONSTRAINT "DeadlineProgress_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineProgress" ADD CONSTRAINT "DeadlineProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

