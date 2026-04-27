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
 * remaining sessions AND have not yet expired. Only *extends* dates (never
 * shortens). Expired subscriptions are intentionally left untouched so
 * their sessions are not resurrected.
 */
export async function syncPtEndDates(params: {
  tx: Tx;
  memberId: string;
  trainerId: string | null;
  newSubscriptionId: string;
  newEndDate: Date;
  now?: Date;
}) {
  const { tx, memberId, trainerId, newSubscriptionId, newEndDate, now = new Date() } = params;

  // Only meaningful for PT/group subscriptions linked to a trainer
  if (!trainerId) return;

  const result = await tx.subscription.updateMany({
    where: {
      memberId,
      trainerId,
      id: { not: newSubscriptionId },
      deletedAt: null,
      // Must still have sessions (paid or bonus)
      OR: [
        { remainingSessions: { gt: 0 } },
        { remainingBonusSessions: { gt: 0 } },
      ],
      // Must not yet be expired (only accumulate active subscriptions)
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        { OR: [{ endDate: null }, { endDate: { lt: newEndDate } }] },
      ],
    },
    data: {
      endDate: newEndDate,
      isActive: true,
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
 * Decrement one session from the subscription with the **earliest endDate**
 * (expiry-first FIFO) for a given member+trainer.
 *
 * Priority within a subscription: paid sessions first, then bonus sessions.
 *
 * @returns updated subscription id, new session counts, and whether a bonus
 *   slot was consumed.
 * @throws if no subscription with available sessions (paid or bonus) is found
 */
export async function decrementSessionFIFO(params: {
  tx: Tx;
  memberId: string;
  trainerId: string;
}): Promise<{
  id: string;
  remainingSessions: number | null;
  remainingBonusSessions: number;
  isBonusSession: boolean;
}> {
  const { tx, memberId, trainerId } = params;

  // Find the subscription expiring soonest that still has paid sessions
  const subWithPaid = await tx.subscription.findFirst({
    where: {
      memberId,
      trainerId,
      isActive: true,
      deletedAt: null,
      remainingSessions: { gt: 0 },
    },
    orderBy: { endDate: "asc" },
    select: { id: true, remainingSessions: true, remainingBonusSessions: true },
  });

  if (subWithPaid) {
    const updated = await tx.subscription.update({
      where: { id: subWithPaid.id },
      data: { remainingSessions: { decrement: 1 } },
      select: { id: true, remainingSessions: true, remainingBonusSessions: true },
    });
    console.log(
      `[FIFO] Paid session decremented from subscription ${updated.id}, remaining paid: ${updated.remainingSessions}, bonus: ${updated.remainingBonusSessions}`,
    );
    return { ...updated, remainingBonusSessions: updated.remainingBonusSessions ?? 0, isBonusSession: false };
  }

  // No paid sessions left — try bonus sessions (same expiry-first order)
  const subWithBonus = await tx.subscription.findFirst({
    where: {
      memberId,
      trainerId,
      isActive: true,
      deletedAt: null,
      remainingBonusSessions: { gt: 0 },
    },
    orderBy: { endDate: "asc" },
    select: { id: true, remainingSessions: true, remainingBonusSessions: true },
  });

  if (subWithBonus) {
    const updated = await tx.subscription.update({
      where: { id: subWithBonus.id },
      data: { remainingBonusSessions: { decrement: 1 } },
      select: { id: true, remainingSessions: true, remainingBonusSessions: true },
    });
    console.log(
      `[FIFO] Bonus session decremented from subscription ${updated.id}, remaining paid: ${updated.remainingSessions}, bonus: ${updated.remainingBonusSessions}`,
    );
    return { ...updated, remainingBonusSessions: updated.remainingBonusSessions ?? 0, isBonusSession: true };
  }

  throw new Error("Member tidak memiliki sisa sesi yang tersedia (paid maupun bonus)");
}
