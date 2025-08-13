-- SQL script to mark existing group sessions as group sessions
-- This script identifies group sessions based on group subscriptions and updates the isGroup field

-- First, let's see what we're working with (optional query for checking current state)
-- SELECT 
--   ts.id,
--   ts.memberId,
--   ts.isGroup,
--   ts.attendanceCount,
--   ts.date,
--   ts.startTime,
--   ts.endTime,
--   m.name as member_name,
--   gs.groupName,
--   gm.status as group_member_status
-- FROM "TrainerSession" ts
-- JOIN "Membership" m ON ts.memberId = m.id
-- LEFT JOIN "GroupMember" gm ON m.id = gm.memberId
-- LEFT JOIN "GroupSubscription" gs ON gm.groupSubscriptionId = gs.id
-- WHERE gm.id IS NOT NULL;

-- Update TrainerSession records to mark group sessions
UPDATE "TrainerSession" 
SET 
  "isGroup" = true,
  "attendanceCount" = COALESCE("attendanceCount", 1),
  "groupId" = gs.id
FROM "Membership" m
JOIN "GroupMember" gm ON m.id = gm."subscriptionId"
JOIN "Subscription" s ON gm."subscriptionId" = s.id
JOIN "GroupSubscription" gs ON gm."groupSubscriptionId" = gs.id
WHERE "TrainerSession"."memberId" = s."memberId"
  AND gm.status = 'ACTIVE'
  AND ("TrainerSession"."isGroup" IS NULL OR "TrainerSession"."isGroup" = false);

-- Update individual sessions to ensure they have proper defaults
UPDATE "TrainerSession" 
SET 
  "isGroup" = false,
  "attendanceCount" = 1
WHERE "isGroup" IS NULL 
  AND "memberId" NOT IN (
    SELECT DISTINCT m.id 
    FROM "Membership" m
    JOIN "GroupMember" gm ON m.id = gm.memberId
    WHERE gm.status = 'ACTIVE'
  );

-- Check the results (optional verification query)
-- SELECT 
--   COUNT(*) as total_sessions,
--   SUM(CASE WHEN "isGroup" = true THEN 1 ELSE 0 END) as group_sessions,
--   SUM(CASE WHEN "isGroup" = false THEN 1 ELSE 0 END) as individual_sessions
-- FROM "TrainerSession";

-- Show group sessions with details (optional verification query)
-- SELECT 
--   ts.id,
--   ts.date,
--   ts.isGroup,
--   ts.attendanceCount,
--   ts.groupId,
--   m.name as member_name,
--   gs.groupName
-- FROM "TrainerSession" ts
-- JOIN "Membership" m ON ts.memberId = m.id
-- LEFT JOIN "GroupSubscription" gs ON ts.groupId = gs.id
-- WHERE ts.isGroup = true
-- ORDER BY ts.date DESC;

WITH active_group_counts AS (
    SELECT
        gm."groupSubscriptionId",
        COUNT(*) AS total_members
    FROM "GroupMember" gm
    WHERE gm.status = 'ACTIVE'
    GROUP BY gm."groupSubscriptionId"
)
UPDATE "TrainerSession" ts
SET
    "isGroup" = true,
    "attendanceCount" = agc.total_members,
    "groupId" = gs.id
FROM "Subscription" s
JOIN "GroupMember" gm
    ON gm."subscriptionId" = s.id
JOIN "GroupSubscription" gs
    ON gs.id = gm."groupSubscriptionId"
JOIN active_group_counts agc
    ON agc."groupSubscriptionId" = gs.id
WHERE ts."memberId" = s."memberId"
  AND (ts."isGroup" IS NULL OR ts."isGroup" = true);