-- AlterTable
ALTER TABLE "RequestStatusHistory" ADD COLUMN     "fromStatus" "RequestStatus",
ADD COLUMN     "isRollback" BOOLEAN NOT NULL DEFAULT false;

WITH "orderedHistory" AS (
    SELECT
        "id",
        LAG("status") OVER (
            PARTITION BY "requestId"
            ORDER BY "changedAt", "id"
        ) AS "fromStatus"
    FROM "RequestStatusHistory"
)
UPDATE "RequestStatusHistory" AS "history"
SET "fromStatus" = "orderedHistory"."fromStatus"
FROM "orderedHistory"
WHERE "history"."id" = "orderedHistory"."id"
  AND "orderedHistory"."fromStatus" IS NOT NULL;
