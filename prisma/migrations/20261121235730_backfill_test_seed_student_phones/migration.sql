UPDATE "Student" AS student
SET "phone" = demo."phone"
FROM (
    VALUES
        ('test.seed.01', '+79000001001'),
        ('test.seed.02', '+79000001002'),
        ('test.seed.03', '+79000001003'),
        ('test.seed.04', '+79000001004'),
        ('test.seed.05', '+79000001005'),
        ('test.seed.06', '+79000001006')
) AS demo("login", "phone")
JOIN "User" AS account ON account."login" = demo."login"
WHERE student."userId" = account."id"
  AND student."phone" IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "Student" AS existing
      WHERE existing."phone" = demo."phone"
  );
