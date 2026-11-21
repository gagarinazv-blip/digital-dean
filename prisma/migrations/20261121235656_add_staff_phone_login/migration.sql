ALTER TABLE "StaffProfile"
ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "StaffProfile_phone_key"
ON "StaffProfile"("phone");

ALTER TABLE "StaffProfile"
ADD CONSTRAINT "StaffProfile_phone_e164_check"
CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');

UPDATE "StaffProfile" AS profile
SET "phone" = demo."phone"
FROM (
    VALUES
        ('staff.demo', '+79000002001'),
        ('staff.other', '+79000002002'),
        ('staff.manager', '+79000002003')
) AS demo("login", "phone")
JOIN "User" AS account ON account."login" = demo."login"
WHERE profile."userId" = account."id"
  AND profile."phone" IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "StaffProfile" AS existing
      WHERE existing."phone" = demo."phone"
  );
