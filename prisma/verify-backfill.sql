-- Verify the backfill operation results

-- Check frozen subscriptions with the new fields populated
SELECT 
  id,
  "isFrozen",
  "frozenAt",
  "freezeDays",
  "freezeMode",
  "remainingDays",
  "endDate"
FROM "Subscription"
WHERE "isFrozen" = true
ORDER BY "frozenAt" DESC
LIMIT 10;

-- Summary statistics
SELECT 
  COUNT(*) as total_frozen_subscriptions,
  COUNT("freezeMode") as subscriptions_with_freeze_mode,
  COUNT("remainingDays") as subscriptions_with_remaining_days,
  COUNT(CASE WHEN "freezeMode" = 'FIXED_DAYS' THEN 1 END) as fixed_days_mode,
  COUNT(CASE WHEN "freezeMode" = 'UNTIL_UNFREEZE' THEN 1 END) as until_unfreeze_mode
FROM "Subscription"
WHERE "isFrozen" = true;