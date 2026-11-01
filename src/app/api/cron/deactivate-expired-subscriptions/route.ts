import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { logApiMutation } from "@/server/utils/mutationLogger";

/**
 * Comprehensive Subscription Management Cron Job
 *
 * Runs every 6 hours to handle:
 *  1. Activate future-dated subscriptions whose startDate has arrived
 *  2. Deactivate expired subscriptions (excluding frozen ones)
 *  3. Deactivate PT/Group subs with 0 remaining sessions
 *  4. Auto-unfreeze FIXED_DAYS subscriptions when freeze period ends
 *  5. Activate scheduled future freezes whose frozenAt has arrived
 */
export async function POST(request: NextRequest) {
  const runStart = Date.now();

  // Helper: extract member & package summary from subscription records
  const toDetail = (sub: any) => ({
    subscriptionId: sub.id,
    memberName: sub.member?.user?.name ?? "Unknown",
    memberEmail: sub.member?.user?.email ?? "Unknown",
    packageName: sub.package?.name ?? "Unknown",
    packageType: sub.package?.type ?? "Unknown",
    startDate: sub.startDate,
    endDate: sub.endDate,
    remainingSessions: sub.remainingSessions,
  });

  // Shared include for findMany queries
  const detailInclude = {
    member: { include: { user: { select: { name: true, email: true } } } },
    package: { select: { name: true, type: true } },
  };

  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Use start of today in WIB (UTC+8) as the expiry cutoff.
    // This ensures a subscription with endDate "April 10" stays active
    // for the full April 10 WIB day and is only deactivated when April 11
    // WIB begins (= April 10 16:00:00 UTC).
    const nowInWIB = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const startOfTodayWIB = new Date(
      Date.UTC(nowInWIB.getUTCFullYear(), nowInWIB.getUTCMonth(), nowInWIB.getUTCDate()) -
        8 * 60 * 60 * 1000,
    );

    const results: Record<string, number> = {};
    const details: Record<string, any[]> = {};

    // Lookup the system admin user once — used as performedBy for freeze/unfreeze operations
    const systemAdmin = await db.user.findUnique({
      where: { email: "admin@fitinfinity.com" },
      select: { id: true },
    });

    // ── 1. Activate future-dated subscriptions whose startDate has arrived ──
    // Skip frozen AND scheduled-freeze subscriptions (freezeMode set = admin scheduled a freeze)
    // Also skip session-based packages (PT/Group/Class) that have 0 remaining sessions
    const toActivate = await db.subscription.findMany({
      where: {
        isActive: false,
        deletedAt: null,
        isFrozen: false,
        freezeMode: null, // Do not activate subscriptions with a pending scheduled freeze
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: startOfTodayWIB } },
        ],
        // Exclude session-based packages with 0 remaining sessions (both paid and bonus)
        NOT: {
          package: {
            type: { in: ["PERSONAL_TRAINER", "GROUP_TRAINING", "CLASS_SESSION"] },
          },
          remainingSessions: { lte: 0 },
          remainingBonusSessions: { lte: 0 },
        },
      },
      include: detailInclude,
    });

    if (toActivate.length > 0) {
      await db.subscription.updateMany({
        where: { id: { in: toActivate.map((s) => s.id) } },
        data: { isActive: true },
      });
    }
    results.activated = toActivate.length;
    details.activated = toActivate.map((s) => ({
      ...toDetail(s),
      action: "isActive: false → true",
    }));

    // ── 2. Deactivate expired subscriptions (skip frozen — their time is paused) ──
    const toDeactivateExpired = await db.subscription.findMany({
      where: {
        isActive: true,
        isFrozen: false,
        deletedAt: null,
        endDate: { lt: startOfTodayWIB },
      },
      include: detailInclude,
    });

    if (toDeactivateExpired.length > 0) {
      await db.subscription.updateMany({
        where: { id: { in: toDeactivateExpired.map((s) => s.id) } },
        data: { isActive: false },
      });
    }
    results.deactivatedExpired = toDeactivateExpired.length;
    details.deactivatedExpired = toDeactivateExpired.map((s) => ({
      ...toDetail(s),
      action: "isActive: true → false (expired)",
      expiredAt: s.endDate,
    }));

    // ── 3. Deactivate PT/Group subs with 0 remaining sessions (paid AND bonus) ──
    // Skip frozen subscriptions — their time is paused, don't change isActive while frozen
    const toDeactivateNoSessions = await db.subscription.findMany({
      where: {
        isActive: true,
        isFrozen: false,
        deletedAt: null,
        remainingSessions: { lte: 0 },
        remainingBonusSessions: { lte: 0 },
        package: {
          type: { in: ["PERSONAL_TRAINER", "GROUP_TRAINING", "CLASS_SESSION"] },
        },
      },
      include: detailInclude,
    });

    if (toDeactivateNoSessions.length > 0) {
      await db.subscription.updateMany({
        where: { id: { in: toDeactivateNoSessions.map((s) => s.id) } },
        data: { isActive: false },
      });
    }
    results.deactivatedNoSessions = toDeactivateNoSessions.length;
    details.deactivatedNoSessions = toDeactivateNoSessions.map((s) => ({
      ...toDetail(s),
      action: "isActive: true → false (0 sessions)",
    }));

    // ── 4. Auto-unfreeze FIXED_DAYS subscriptions when freeze period ends ──
    const frozenFixedDaySubs = await db.subscription.findMany({
      where: {
        isFrozen: true,
        deletedAt: null,
        freezeMode: "FIXED_DAYS",
        frozenAt: { not: null },
        freezeDays: { gt: 0 },
      },
      include: detailInclude,
    });

    // Filter subs whose freeze period has actually elapsed
    const subsToUnfreeze = frozenFixedDaySubs.filter((sub) => {
      if (!sub.frozenAt || !sub.freezeDays) return false;
      const freezeEndDate = new Date(sub.frozenAt);
      freezeEndDate.setDate(freezeEndDate.getDate() + sub.freezeDays);
      return freezeEndDate <= now;
    });

    let autoUnfrozenCount = 0;
    const autoUnfreezeDetails: any[] = [];

    if (subsToUnfreeze.length > 0) {
      let unfreezePrice = await db.freezePrice.findFirst({
        where: { freezeDays: 0, price: 0 },
      });
      if (!unfreezePrice) {
        unfreezePrice = await db.freezePrice.create({
          data: { freezeDays: 0, price: 0, isActive: true },
        });
      }

      for (const sub of subsToUnfreeze) {
        const remainingDays = sub.remainingDays ?? 0;
        const newEndDate = new Date(now);
        newEndDate.setDate(newEndDate.getDate() + remainingDays);
        newEndDate.setHours(23, 59, 59, 999);

        // For session-based packages with 0 sessions, don't reactivate
        const isSessionBased = ["PERSONAL_TRAINER", "GROUP_TRAINING", "CLASS_SESSION"].includes(sub.package?.type ?? "");
        const hasNoSessions = (sub.remainingSessions ?? 0) <= 0 && (sub.remainingBonusSessions ?? 0) <= 0;
        const shouldActivate = !(isSessionBased && hasNoSessions);

        await db.subscription.update({
          where: { id: sub.id },
          data: {
            isFrozen: false,
            isActive: shouldActivate,
            frozenAt: null,
            freezeDays: null,
            freezeMode: null,
            remainingDays: null,
            endDate: newEndDate,
          },
        });

        if (systemAdmin) {
          await db.freezeOperation.create({
            data: {
              subscriptionId: sub.id,
              memberId: sub.memberId,
              operationType: "UNFREEZE",
              freezePriceId: unfreezePrice.id,
              price: 0,
              freezeDays: 0,
              performedById: systemAdmin.id,
            },
          });
        }

        autoUnfrozenCount++;
        autoUnfreezeDetails.push({
          ...toDetail(sub),
          action: "isFrozen: true → false (FIXED_DAYS expired)",
          performedBy: "admin@fitinfinity.com",
          frozenAt: sub.frozenAt,
          freezeDays: sub.freezeDays,
          remainingDays,
          newEndDate: newEndDate.toISOString(),
        });
      }
    }
    results.autoUnfrozen = autoUnfrozenCount;
    details.autoUnfrozen = autoUnfreezeDetails;

    // ── 5. Activate scheduled future freezes whose frozenAt has arrived ──
    const toActivateFreezes = await db.subscription.findMany({
      where: {
        isFrozen: false,
        deletedAt: null,
        frozenAt: { lte: now, not: null },
        freezeMode: { not: null },
      },
      include: detailInclude,
    });

    if (toActivateFreezes.length > 0) {
      // The FreezeOperation record was already created by the `freeze` mutation
      // when the freeze was scheduled — only flip the flag here.
      const freezeSubIds = toActivateFreezes.map((s) => s.id);
      await db.subscription.updateMany({
        where: { id: { in: freezeSubIds } },
        data: { isFrozen: true },
      });

      // Cascade freeze to group members whose leader subscription was just activated
      const groupMembersToCascade = await db.groupMember.findMany({
        where: {
          status: "ACTIVE",
          groupSubscription: {
            leadSubscriptionId: { in: freezeSubIds },
          },
          subscription: {
            isFrozen: false,
            deletedAt: null,
            OR: [
              { remainingSessions: { gt: 0 } },
              { remainingBonusSessions: { gt: 0 } },
            ],
          },
        },
        select: {
          subscriptionId: true,
          subscription: { select: { frozenAt: true, freezeDays: true, freezeMode: true, endDate: true } },
        },
      });

      if (groupMembersToCascade.length > 0) {
        // Use the first activated freeze's parameters for consistency
        const refSub = toActivateFreezes[0]!;
        await db.subscription.updateMany({
          where: { id: { in: groupMembersToCascade.map((gm) => gm.subscriptionId) } },
          data: {
            isFrozen: true,
            frozenAt: refSub.frozenAt,
            freezeDays: refSub.freezeDays,
            freezeMode: refSub.freezeMode,
          },
        });
      }
    }
    results.scheduledFreezesActivated = toActivateFreezes.length;
    details.scheduledFreezesActivated = toActivateFreezes.map((s) => ({
      ...toDetail(s),
      action: "isFrozen: false → true (scheduled freeze)",
      frozenAt: s.frozenAt,
      freezeMode: s.freezeMode,
    }));

    // ── 6. Sync group member sessions, endDate, and freeze status to match leader ──
    const activeGroups = await db.groupSubscription.findMany({
      where: { status: "ACTIVE" },
      include: {
        leadSubscription: {
          select: {
            id: true,
            remainingSessions: true,
            remainingBonusSessions: true,
            endDate: true,
            isFrozen: true,
            frozenAt: true,
            freezeDays: true,
            freezeMode: true,
            remainingDays: true,
          },
        },
        groupMembers: {
          where: { status: "ACTIVE" },
          select: { subscriptionId: true },
        },
      },
    });

    let groupSessionsSynced = 0;
    for (const group of activeGroups) {
      const partnerSubIds = group.groupMembers
        .filter(gm => gm.subscriptionId !== group.leadSubscriptionId)
        .map(gm => gm.subscriptionId);
      if (partnerSubIds.length > 0) {
        const r = await db.subscription.updateMany({
          where: { id: { in: partnerSubIds } },
          data: {
            remainingSessions: group.leadSubscription.remainingSessions,
            remainingBonusSessions: group.leadSubscription.remainingBonusSessions,
            endDate: group.leadSubscription.endDate,
            isFrozen: group.leadSubscription.isFrozen,
            frozenAt: group.leadSubscription.frozenAt,
            freezeDays: group.leadSubscription.freezeDays,
            freezeMode: group.leadSubscription.freezeMode,
            remainingDays: group.leadSubscription.remainingDays,
          },
        });
        groupSessionsSynced += r.count;
      }
    }
    results.groupSessionsSynced = groupSessionsSynced;
    console.log(`[CRON] Synced ${groupSessionsSynced} group member subscription(s) across ${activeGroups.length} group(s)`);

    // ── Summary ──
    const duration = Date.now() - runStart;
    const summary = {
      success: true,
      timestamp: now.toISOString(),
      durationMs: duration,
      results,
      details,
    };

    console.log(`[CRON] Subscription management completed in ${duration}ms:`, results);

    // Persist full details to Logs table for audit trail
    await logApiMutation({
      db,
      endpoint: "cron.subscriptionManagement",
      method: "POST",
      userId: systemAdmin?.id ?? null,
      requestData: { trigger: "scheduled", schedule: "every 6 hours" },
      responseData: { results, details },
      success: true,
      duration,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const duration = Date.now() - runStart;
    console.error("[CRON] Error in subscription management cron:", error);

    // Log failure to Logs table
    await logApiMutation({
      db,
      endpoint: "cron.subscriptionManagement",
      method: "POST",
      userId: null,
      requestData: { trigger: "scheduled", schedule: "every 6 hours" },
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      duration,
    }).catch(() => {});

    return NextResponse.json(
      {
        error: "Failed to run subscription management cron",
        details: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
      },
      { status: 500 },
    );
  }
}

// GET for manual testing / health check
export async function GET() {
  return NextResponse.json({
    message: "Subscription Management Cron Job",
    endpoint: "/api/cron/deactivate-expired-subscriptions",
    method: "POST",
    schedule: "Every 6 hours",
    operations: [
      "1. Activate future-dated subscriptions",
      "2. Deactivate expired subscriptions (skip frozen)",
      "3. Deactivate PT/Group subs with 0 sessions",
      "4. Auto-unfreeze FIXED_DAYS when freeze period ends",
      "5. Activate scheduled future freezes",
      "6. Sync group member sessions to match leader",
    ],
    headers: {
      Authorization: "Bearer YOUR_CRON_SECRET_TOKEN",
    },
  });
}