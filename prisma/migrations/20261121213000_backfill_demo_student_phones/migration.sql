UPDATE "Student" AS student
SET "phone" = demo."phone"
FROM (
    VALUES
        ('student.alpha', '+79000000001'),
        ('student.beta', '+79000000002')
) AS demo("login", "phone")
JOIN "User" AS account ON account."login" = demo."login"
WHERE student."userId" = account."id"
  AND student."phone" IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "Student" AS existing
      WHERE existing."phone" = demo."phone"
  );
