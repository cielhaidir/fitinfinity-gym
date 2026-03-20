import { Prisma, PackageType, PaymentStatus } from "@prisma/client";
import { syncPtEndDates } from "@/server/utils/ptSubscriptionUtils";

interface ApplyPromoInput {
  tx: Prisma.TransactionClient;
  paymentId: string;
  subscriptionId: string;
}

interface AppliedPromoResult {
  promoId: string;
  promoName: string;
  bonusPackageName: string | null;
  bonusSubscriptionId: string | null;
  bonusPaymentId: string | null;
}

/**
 * Compute the start date for a bonus subscription based on bonusStartMode.
 *
 * - IMMEDIATE: starts right now.
 * - AFTER_CURRENT: starts after the latest active subscription of the same
 *   package type expires. If no active sub exists, starts now.
 */
async function computeBonusStartDate(
  tx: Prisma.TransactionClient,
  memberId: string,
  bonusPackageType: string,
  bonusStartMode: string,
  bonusCustomStartDate?: Date | null,
): Promise<Date> {
  const now = new Date();

  if (bonusStartMode === "IMMEDIATE") {
    return now;
  }

  if (bonusStartMode === "CUSTOM_DATE" && bonusCustomStartDate) {
    return bonusCustomStartDate;
  }

  if (bonusStartMode === "AFTER_CURRENT") {
    const latestActiveSub = await tx.subscription.findFirst({
      where: {
        memberId,
        isActive: true,
        deletedAt: null,
        package: { type: bonusPackageType as PackageType },
        endDate: { not: null, gte: now },
      },
      orderBy: { endDate: "desc" },
      select: { endDate: true },
    });

    if (latestActiveSub?.endDate) {
      return latestActiveSub.endDate;
    }
  }

  return now;
}

export async function applyPromosForSuccessfulPayment({
  tx,
  paymentId,
  subscriptionId,
}: ApplyPromoInput): Promise<AppliedPromoResult[]> {
  const now = new Date();

  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true },
  });

  if (!subscription) {
    return [];
  }

  const promos = await tx.promoCampaign.findMany({
    where: {
      isActive: true,
      triggerPackageId: subscription.packageId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: { bonusPackage: true },
    orderBy: { createdAt: "asc" },
  });

  if (promos.length === 0) {
    return [];
  }

  const applied: AppliedPromoResult[] = [];

  for (const promo of promos) {
    // Must have a bonus package configured
    if (!promo.bonusPackageId || !promo.bonusPackage) {
      continue;
    }

    // Check max-per-member limit
    const redeemedCount = await tx.promoRedemption.count({
      where: {
        promoId: promo.id,
        memberId: subscription.memberId,
      },
    });

    if (promo.maxPerMember && redeemedCount >= promo.maxPerMember) {
      continue;
    }

    const bonusPackage = promo.bonusPackage;

    // Determine bonus start date based on bonusStartMode
    const bonusStartDate = await computeBonusStartDate(
      tx,
      subscription.memberId,
      bonusPackage.type,
      promo.bonusStartMode ?? "AFTER_CURRENT",
      promo.bonusCustomStartDate,
    );

    // Compute end date based on package type
    let bonusEndDate: Date | null = null;
    let bonusSessions: number | null = null;

    if (bonusPackage.type === PackageType.GYM_MEMBERSHIP && bonusPackage.day) {
      bonusEndDate = new Date(bonusStartDate);
      bonusEndDate.setDate(bonusEndDate.getDate() + bonusPackage.day);
    } else if (
      bonusPackage.type === PackageType.PERSONAL_TRAINER ||
      bonusPackage.type === PackageType.GROUP_TRAINING
    ) {
      bonusSessions = bonusPackage.sessions ?? 0;
      // Calculate endDate for PT/Group bonus using package.day
      if (bonusPackage.day) {
        bonusEndDate = new Date(bonusStartDate);
        bonusEndDate.setDate(bonusEndDate.getDate() + bonusPackage.day);
      }
    }

    // Create the bonus subscription (treated as a normal subscription)
    const isActiveNow = bonusStartDate.getTime() <= now.getTime();

    const bonusTrainerId =
      bonusPackage.type === PackageType.PERSONAL_TRAINER
        ? subscription.trainerId
        : null;

    const bonusSubscription = await tx.subscription.create({
      data: {
        memberId: subscription.memberId,
        packageId: bonusPackage.id,
        trainerId: bonusTrainerId,
        startDate: bonusStartDate,
        endDate: bonusEndDate,
        remainingSessions: bonusSessions,
        isActive: isActiveNow,
        salesId: subscription.salesId,
        salesType: subscription.salesType,
      },
    });

    // Sync endDate of older PT/group subscriptions for same member+trainer
    if (bonusTrainerId && bonusEndDate) {
      await syncPtEndDates({
        tx,
        memberId: subscription.memberId,
        trainerId: bonusTrainerId,
        newSubscriptionId: bonusSubscription.id,
        newEndDate: bonusEndDate,
      });
    }

    // Create a Payment record with totalPayment=0 (promo/free)
    // This makes the bonus appear in all payment history and reports
    const bonusPayment = await tx.payment.create({
      data: {
        subscriptionId: bonusSubscription.id,
        status: PaymentStatus.SUCCESS,
        method: "PROMO",
        amount: 0,
        totalPayment: 0,
        paidAt: now,
      },
    });

    try {
      await tx.promoRedemption.create({
        data: {
          promoId: promo.id,
          memberId: subscription.memberId,
          triggerSubscriptionId: subscription.id,
          bonusSubscriptionId: bonusSubscription.id,
          paymentId: bonusPayment.id,
          bonusPtSessions: bonusSessions ?? 0,
          note: `Bonus ${bonusPackage.name} dari promo "${promo.name}"${
            !isActiveNow
              ? ` (mulai ${bonusStartDate.toISOString().slice(0, 10)})`
              : ""
          }`,
        },
      });

      applied.push({
        promoId: promo.id,
        promoName: promo.name,
        bonusPackageName: bonusPackage.name,
        bonusSubscriptionId: bonusSubscription.id,
        bonusPaymentId: bonusPayment.id,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Duplicate – already redeemed for this payment
        continue;
      }
      throw error;
    }
  }

  return applied;
}
