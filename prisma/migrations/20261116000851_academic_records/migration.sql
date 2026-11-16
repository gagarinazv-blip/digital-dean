-- CreateEnum
CREATE TYPE "StudyForm" AS ENUM ('FULL_TIME', 'PART_TIME', 'CORRESPONDENCE');

-- CreateEnum
CREATE TYPE "AcademicResultStatus" AS ENUM ('PASSED', 'ACADEMIC_DEBT');

-- CreateEnum
CREATE TYPE "AcademicSessionStatus" AS ENUM ('COMPLETED', 'PLANNED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "recordBookNumber" TEXT,
ADD COLUMN     "studyForm" "StudyForm";

-- CreateTable
CREATE TABLE "AcademicDataset" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,

    CONSTRAINT "AcademicDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSemester" (
    "id" SERIAL NOT NULL,
    "datasetId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicSemester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPlanItem" (
    "id" TEXT NOT NULL,
    "semesterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "controlType" "ControlType" NOT NULL,

    CONSTRAINT "AcademicPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicResult" (
    "id" SERIAL NOT NULL,
    "planItemId" TEXT NOT NULL,
    "status" "AcademicResultStatus" NOT NULL,
    "value" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "attemptCount" INTEGER NOT NULL,

    CONSTRAINT "AcademicResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicAttempt" (
    "id" SERIAL NOT NULL,
    "resultId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AcademicAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSessionItem" (
    "id" SERIAL NOT NULL,
    "planItemId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "room" TEXT NOT NULL,
    "status" "AcademicSessionStatus" NOT NULL,

    CONSTRAINT "AcademicSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicSemester_studentId_isCurrent_idx" ON "AcademicSemester"("studentId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSemester_datasetId_studentId_code_key" ON "AcademicSemester"("datasetId", "studentId", "code");

-- CreateIndex
CREATE INDEX "AcademicPlanItem_semesterId_idx" ON "AcademicPlanItem"("semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicResult_planItemId_key" ON "AcademicResult"("planItemId");

-- CreateIndex
CREATE INDEX "AcademicAttempt_date_idx" ON "AcademicAttempt"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicAttempt_resultId_attemptNumber_key" ON "AcademicAttempt"("resultId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AcademicSessionItem_planItemId_date_idx" ON "AcademicSessionItem"("planItemId", "date");

-- CreateIndex
CREATE INDEX "AcademicSessionItem_date_startTime_idx" ON "AcademicSessionItem"("date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Student_recordBookNumber_key" ON "Student"("recordBookNumber");

-- AddForeignKey
ALTER TABLE "AcademicSemester" ADD CONSTRAINT "AcademicSemester_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AcademicDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSemester" ADD CONSTRAINT "AcademicSemester_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPlanItem" ADD CONSTRAINT "AcademicPlanItem_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "AcademicSemester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicResult" ADD CONSTRAINT "AcademicResult_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "AcademicPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAttempt" ADD CONSTRAINT "AcademicAttempt_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AcademicResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSessionItem" ADD CONSTRAINT "AcademicSessionItem_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "AcademicPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
