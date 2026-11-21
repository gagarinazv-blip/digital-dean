CREATE TYPE "StudentAuditAction" AS ENUM (
    'STUDENT_CREATED',
    'PROFILE_UPDATED',
    'PHONE_CHANGED',
    'CORPORATE_EMAIL_CHANGED',
    'CORPORATE_MAIL_PASSWORD_SET',
    'CORPORATE_MAIL_PASSWORD_REPLACED',
    'CORPORATE_MAIL_PASSWORD_CLEARED',
    'ACCESS_RESET'
);

CREATE TABLE "StudentAuditLog" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "actorUserId" INTEGER,
    "action" "StudentAuditAction" NOT NULL,
    "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentAuditLog_studentId_createdAt_idx"
ON "StudentAuditLog"("studentId", "createdAt");

CREATE INDEX "StudentAuditLog_actorUserId_createdAt_idx"
ON "StudentAuditLog"("actorUserId", "createdAt");

ALTER TABLE "StudentAuditLog"
ADD CONSTRAINT "StudentAuditLog_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentAuditLog"
ADD CONSTRAINT "StudentAuditLog_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
