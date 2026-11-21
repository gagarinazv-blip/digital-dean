-- CreateTable
CREATE TABLE "RequestAssignmentHistory" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "fromAssignedToId" INTEGER,
    "toAssignedToId" INTEGER,
    "changedByUserId" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestAssignmentHistory_requestId_changedAt_idx" ON "RequestAssignmentHistory"("requestId", "changedAt");

-- CreateIndex
CREATE INDEX "RequestAssignmentHistory_changedByUserId_idx" ON "RequestAssignmentHistory"("changedByUserId");

-- AddForeignKey
ALTER TABLE "RequestAssignmentHistory" ADD CONSTRAINT "RequestAssignmentHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAssignmentHistory" ADD CONSTRAINT "RequestAssignmentHistory_fromAssignedToId_fkey" FOREIGN KEY ("fromAssignedToId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAssignmentHistory" ADD CONSTRAINT "RequestAssignmentHistory_toAssignedToId_fkey" FOREIGN KEY ("toAssignedToId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAssignmentHistory" ADD CONSTRAINT "RequestAssignmentHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
