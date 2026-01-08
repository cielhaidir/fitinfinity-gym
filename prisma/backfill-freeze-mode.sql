-- Backfill existing frozen subscriptions with freeze mode and remaining days
-- This script updates existing frozen subscriptions to work with the new freeze logic

UPDATE "Subscription"
SET
  "freezeMode" = 
    CASE
      WHEN "freezeDays" IS NOT NULL AND "freezeDays" > 0 THEN 'FIXED_DAYS'::"FreezeMode"
      ELSE 'UNTIL_UNFREEZE'::"FreezeMode"
    END,
  "remainingDays" = 
    GREATEST(
      0,
      CEIL(EXTRACT(EPOCH FROM ("endDate" - "frozenAt")) / 86400.0)
    )::int
WHERE
  "isFrozen" = true
  AND "frozenAt" IS NOT NULL
  AND "endDate" IS NOT NULL
  AND "remainingDays" IS NULL;

-- Display the count of updated rows
SELECT 
  COUNT(*) as updated_rows,
  'Backfill completed: frozen subscriptions updated with freezeMode and remainingDays' as message
FROM "Subscription"
WHERE
  "isFrozen" = true
  AND "frozenAt" IS NOT NULL
  AND "freezeMode" IS NOT NULL;