-- CreateTable
CREATE TABLE "LoginAttempt" (
    "keyHash" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("keyHash")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_windowStartedAt_idx" ON "LoginAttempt"("windowStartedAt");
