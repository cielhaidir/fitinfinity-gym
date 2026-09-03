import type { Prisma } from "@prisma/client";

/**
 * Canonical definition of an "active" subscription.
 *
 * Freezing does NOT flip `isActive` to false (the member's time is paused,
 * not ended), so every query that means "member can currently use the gym /
 * counts as an active member" must also exclude frozen subscriptions.
 *
 * Use this everywhere instead of ad-hoc `{ isActive: true }` filters so the
 * dashboard, reports, check-in and class coverage all agree.
 */
export const ACTIVE_SUB_WHERE = {
  isActive: true,
  isFrozen: false,
  deletedAt: null,
} as const satisfies Prisma.SubscriptionWhereInput;
