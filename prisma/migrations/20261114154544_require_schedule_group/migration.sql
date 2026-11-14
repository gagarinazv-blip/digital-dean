/*
  Warnings:

  - Made the column `groupId` on table `ScheduleItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ScheduleItem" ALTER COLUMN "groupId" SET NOT NULL;
