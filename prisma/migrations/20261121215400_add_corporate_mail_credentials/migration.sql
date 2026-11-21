ALTER TABLE "Student"
ADD COLUMN "corporateEmail" TEXT,
ADD COLUMN "corporateMailPasswordEncrypted" TEXT,
ADD COLUMN "corporateMailIssuedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Student_corporateEmail_key"
ON "Student"("corporateEmail");
