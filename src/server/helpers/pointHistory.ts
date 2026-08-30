import { type PrismaClient } from "@prisma/client";

type PointHistoryType = "EARN" | "SPEND" | "DEDUCT" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT";
type PointHistorySource = "CHECKIN" | "GROUP_CLASS" | "PAYMENT" | "REWARD_CLAIM" | "TRANSFER" | "ADMIN_ADJUST" | "SUBSCRIPTION" | "PACKAGE_PURCHASE" | "CANCEL_SUBSCRIPTION";

/**
 * Log a point history entry. Call this AFTER updating user.point.
 * It reads the current balance from the user record.
 */
export async function logPointHistory(
  db: PrismaClient | any,
  params: {
    userId: string;
    amount: number; // positive = earned, negative = spent
    type: PointHistoryType;
    source: PointHistorySource | string;
    description: string;
    referenceId?: string;
  },
) {
  try {
    const user = await db.user.findUnique({
      where: { id: params.userId },
      select: { point: true },
    });
    
    await db.pointHistory.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        balance: user?.point ?? 0,
        type: params.type,
        source: params.source,
        description: params.description,
        referenceId: params.referenceId ?? null,
      },
    });
  } catch (err) {
    // Don't let point history logging break the main flow
    console.error("Failed to log point history:", err);
  }
}
