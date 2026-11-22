-- CreateEnum
CREATE TYPE "StaffNotificationType" AS ENUM ('NEW_REQUEST', 'DOCUMENT_ADDED', 'REQUEST_ASSIGNED', 'REQUEST_REASSIGNED');

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "eventKey" TEXT NOT NULL,
    "type" "StaffNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "relatedRequestId" INTEGER,
    "relatedStudentId" INTEGER,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffNotification_publicId_key" ON "StaffNotification"("publicId");

-- CreateIndex
CREATE INDEX "StaffNotification_recipientId_createdAt_idx" ON "StaffNotification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_recipientId_readAt_createdAt_idx" ON "StaffNotification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffNotification_recipientId_eventKey_key" ON "StaffNotification"("recipientId", "eventKey");

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_relatedRequestId_fkey" FOREIGN KEY ("relatedRequestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_relatedStudentId_fkey" FOREIGN KEY ("relatedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
