/**
 * PT Subscription Utilities
 *
 * 1. syncPtEndDates – When a new PT/Group subscription is created, extend
 *    the endDate of all older active PT subscriptions for the same
 *    member+trainer so their remaining sessions stay usable.
 *
 * 2. decrementSessionFIFO – When a trainer records a session, decrement
 *    the oldest active subscription first (FIFO).
 */

import { type Prisma, type PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

// ─── 1. Sync PT End Dates ───────────────────────────────────────────────

/**
 * After a new PT/Group subscription is created, update the endDate of
 * all existing subscriptions for the same member+trainer that still have
 * remaining sessions. Only *extends* dates (never shortens).
 */
export async function syncPtEndDates(params: {
  tx: Tx;
  memberId: string;
  trainerId: string | null;
  newSubscriptionId: string;
  newEndDate: Date;
}) {
  const { tx, memberId, trainerId, newSubscriptionId, newEndDate } = params;

  // Only meaningful for PT/group subscriptions linked to a trainer
  if (!trainerId) return;

  const result = await tx.subscription.updateMany({
    where: {
      memberId,
      trainerId,
      id: { not: newSubscriptionId },
      deletedAt: null,
      remainingSessions: { gt: 0 },
      OR: [
        { endDate: null },
        { endDate: { lt: newEndDate } },
      ],
    },
    data: {
      endDate: newEndDate,
      isActive: true, // Re-activate subs that may have been expired by time
    },
  });

  if (result.count > 0) {
    console.log(
      `[syncPtEndDates] Extended endDate of ${result.count} older PT subscription(s) to ${newEndDate.toISOString()}`,
    );
  }
}

// ─── 2. FIFO Session Decrement ──────────────────────────────────────────

/**
 * Decrement one session from the **oldest** active subscription (by
 * startDate ASC) for a given member+trainer that still has remaining
 * sessions > 0 and is not soft-deleted.
 *
 * @returns the updated subscription (id + new remainingSessions value)
 * @throws if no subscription with available sessions is found
 */
export async function decrementSessionFIFO(params: {
  tx: Tx;
  memberId: string;
  trainerId: string;
}): Promise<{ id: string; remainingSessions: number | null }> {
  const { tx, memberId, trainerId } = params;

  // Find the oldest subscription with remaining sessions (FIFO)
  const oldestSub = await tx.subscription.findFirst({
    where: {
      memberId,
      trainerId,
      deletedAt: null,
      remainingSessions: { gt: 0 },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      remainingSessions: true,
    },
  });

  if (!oldestSub || !oldestSub.remainingSessions) {
    throw new Error("Member tidak memiliki sisa sesi yang tersedia");
  }

  const updated = await tx.subscription.update({
    where: { id: oldestSub.id },
    data: {
      remainingSessions: { decrement: 1 },
    },
    select: {
      id: true,
      remainingSessions: true,
    },
  });

  console.log(
    `[FIFO] Decremented session from subscription ${updated.id} (oldest), remaining: ${updated.remainingSessions}`,
  );

  return updated;
}
