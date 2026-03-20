-- Migration: Add Promo Campaign feature
-- Run this BEFORE deploying the new code to production

-- 1. Create enums
CREATE TYPE "PromoBenefitType" AS ENUM ('BONUS_PT_SESSIONS', 'BONUS_PACKAGE');
CREATE TYPE "BonusStartMode" AS ENUM ('IMMEDIATE', 'AFTER_CURRENT');

-- 2. Create PromoCampaign table
CREATE TABLE "PromoCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "triggerPackageId" TEXT NOT NULL,
    "bonusType" "PromoBenefitType" NOT NULL DEFAULT 'BONUS_PACKAGE',
    "bonusPtSessions" INTEGER DEFAULT 0,
    "bonusPackageId" TEXT,
    "bonusStartMode" "BonusStartMode" NOT NULL DEFAULT 'AFTER_CURRENT',
    "maxPerMember" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCampaign_pkey" PRIMARY KEY ("id")
);

-- 3. Create PromoRedemption table
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "triggerSubscriptionId" TEXT NOT NULL,
    "bonusSubscriptionId" TEXT,
    "paymentId" TEXT NOT NULL,
    "bonusPtSessions" INTEGER DEFAULT 0,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- 4. Create indexes for PromoCampaign
CREATE INDEX "PromoCampaign_isActive_startDate_endDate_idx" ON "PromoCampaign"("isActive", "startDate", "endDate");
CREATE INDEX "PromoCampaign_triggerPackageId_idx" ON "PromoCampaign"("triggerPackageId");
CREATE INDEX "PromoCampaign_bonusPackageId_idx" ON "PromoCampaign"("bonusPackageId");

-- 5. Create indexes and unique constraint for PromoRedemption
CREATE UNIQUE INDEX "PromoRedemption_promoId_paymentId_key" ON "PromoRedemption"("promoId", "paymentId");
CREATE INDEX "PromoRedemption_memberId_grantedAt_idx" ON "PromoRedemption"("memberId", "grantedAt");
CREATE INDEX "PromoRedemption_triggerSubscriptionId_idx" ON "PromoRedemption"("triggerSubscriptionId");
CREATE INDEX "PromoRedemption_bonusSubscriptionId_idx" ON "PromoRedemption"("bonusSubscriptionId");
CREATE INDEX "PromoRedemption_paymentId_idx" ON "PromoRedemption"("paymentId");

-- 6. Add foreign keys for PromoCampaign
ALTER TABLE "PromoCampaign" ADD CONSTRAINT "PromoCampaign_triggerPackageId_fkey" FOREIGN KEY ("triggerPackageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoCampaign" ADD CONSTRAINT "PromoCampaign_bonusPackageId_fkey" FOREIGN KEY ("bonusPackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Add foreign keys for PromoRedemption
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "PromoCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_triggerSubscriptionId_fkey" FOREIGN KEY ("triggerSubscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_bonusSubscriptionId_fkey" FOREIGN KEY ("bonusSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
