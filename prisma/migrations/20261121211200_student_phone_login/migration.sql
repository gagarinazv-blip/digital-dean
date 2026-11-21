-- CreateEnum
CREATE TYPE "StudentAccountStatus" AS ENUM ('INVITED', 'ACTIVE');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "requiresPasswordSetup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "accountStatus" "StudentAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LoginCode" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginCode_phone_createdAt_idx" ON "LoginCode"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "LoginCode_ip_createdAt_idx" ON "LoginCode"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "LoginCode_expiresAt_idx" ON "LoginCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Student_phone_key" ON "Student"("phone");

-- Preserve legacy students without a registered phone while validating new values.
ALTER TABLE "Student"
ADD CONSTRAINT "Student_phone_e164_check"
CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');
