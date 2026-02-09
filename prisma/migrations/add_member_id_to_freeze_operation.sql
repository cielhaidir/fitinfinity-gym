-- Add memberId column to FreezeOperation table
-- This migration adds member tracking to freeze operations and populates existing data

-- Step 1: Add the memberId column (nullable first to allow data migration)
ALTER TABLE "FreezeOperation" ADD COLUMN "memberId" TEXT;

-- Step 2: Populate memberId from the subscription relation
UPDATE "FreezeOperation" 
SET "memberId" = "Subscription"."memberId"
FROM "Subscription"
WHERE "FreezeOperation"."subscriptionId" = "Subscription"."id";

-- Step 3: Make memberId NOT NULL now that data is populated
ALTER TABLE "FreezeOperation" ALTER COLUMN "memberId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "FreezeOperation" 
ADD CONSTRAINT "FreezeOperation_memberId_fkey" 
FOREIGN KEY ("memberId") REFERENCES "Membership"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Create index for better query performance
CREATE INDEX "FreezeOperation_memberId_idx" ON "FreezeOperation"("memberId");
