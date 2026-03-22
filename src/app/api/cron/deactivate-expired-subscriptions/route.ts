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
    const results: Record<string, number> = {};
    const details: Record<string, any[]> = {};

    // Lookup the system admin user once — used as performedBy for freeze/unfreeze operations
    const systemAdmin = await db.user.findUnique({
      where: { email: "admin@fitinfinity.com" },
      select: { id: true },
    });

    // ── 1. Activate future-dated subscriptions whose startDate has arrived ──
    const toActivate = await db.subscription.findMany({
      where: {
        isActive: false,
        deletedAt: null,
        isFrozen: false,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
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
        endDate: { lt: now },
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

    // ── 3. Deactivate PT/Group subs with 0 remaining sessions ──
    const toDeactivateNoSessions = await db.subscription.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        remainingSessions: { lte: 0 },
        package: {
          type: { in: ["PERSONAL_TRAINER", "GROUP_TRAINING"] },
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

        await db.subscription.update({
          where: { id: sub.id },
          data: {
            isFrozen: false,
            isActive: true,
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
      await db.subscription.updateMany({
        where: { id: { in: toActivateFreezes.map((s) => s.id) } },
        data: { isFrozen: true },
      });

      // Create FREEZE operation records for audit trail
      if (systemAdmin) {
        let freezePrice = await db.freezePrice.findFirst({
          where: { isActive: true },
          orderBy: { price: "asc" },
        });
        if (!freezePrice) {
          freezePrice = await db.freezePrice.findFirst();
        }

        if (freezePrice) {
          for (const sub of toActivateFreezes) {
            await db.freezeOperation.create({
              data: {
                subscriptionId: sub.id,
                memberId: sub.memberId,
                operationType: "FREEZE",
                freezePriceId: freezePrice.id,
                price: 0,
                freezeDays: sub.freezeDays ?? 0,
                performedById: systemAdmin.id,
              },
            });
          }
        }
      }
    }
    results.scheduledFreezesActivated = toActivateFreezes.length;
    details.scheduledFreezesActivated = toActivateFreezes.map((s) => ({
      ...toDetail(s),
      action: "isFrozen: false → true (scheduled freeze)",
      performedBy: "admin@fitinfinity.com",
      frozenAt: s.frozenAt,
      freezeMode: s.freezeMode,
    }));

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
    ],
    headers: {
      Authorization: "Bearer YOUR_CRON_SECRET_TOKEN",
    },
  });
}