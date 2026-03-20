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

  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results: Record<string, number> = {};

    // ── 1. Activate future-dated subscriptions whose startDate has arrived ──
    const activated = await db.subscription.updateMany({
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
      data: { isActive: true },
    });
    results.activated = activated.count;

    // ── 2. Deactivate expired subscriptions (skip frozen — their time is paused) ──
    const deactivatedExpired = await db.subscription.updateMany({
      where: {
        isActive: true,
        isFrozen: false,
        deletedAt: null,
        endDate: { lt: now },
      },
      data: { isActive: false },
    });
    results.deactivatedExpired = deactivatedExpired.count;

    // ── 3. Deactivate PT/Group subs with 0 remaining sessions ──
    const deactivatedNoSessions = await db.subscription.updateMany({
      where: {
        isActive: true,
        deletedAt: null,
        remainingSessions: { lte: 0 },
        package: {
          type: { in: ["PERSONAL_TRAINER", "GROUP_TRAINING"] },
        },
      },
      data: { isActive: false },
    });
    results.deactivatedNoSessions = deactivatedNoSessions.count;

    // ── 4. Auto-unfreeze FIXED_DAYS subscriptions when freeze period ends ──
    // Find frozen subs where frozenAt + freezeDays <= now
    const frozenFixedDaySubs = await db.subscription.findMany({
      where: {
        isFrozen: true,
        deletedAt: null,
        freezeMode: "FIXED_DAYS",
        frozenAt: { not: null },
        freezeDays: { gt: 0 },
      },
      select: {
        id: true,
        frozenAt: true,
        freezeDays: true,
        remainingDays: true,
        endDate: true,
        memberId: true,
      },
    });

    // Filter subs whose freeze period has actually elapsed
    const subsToUnfreeze = frozenFixedDaySubs.filter((sub) => {
      if (!sub.frozenAt || !sub.freezeDays) return false;
      const freezeEndDate = new Date(sub.frozenAt);
      freezeEndDate.setDate(freezeEndDate.getDate() + sub.freezeDays);
      return freezeEndDate <= now;
    });

    let autoUnfrozenCount = 0;

    if (subsToUnfreeze.length > 0) {
      // Lookup admin user + unfreezePrice once (outside loop)
      const adminUser = await db.user.findFirst({
        where: { roles: { some: { name: "Admin" } } },
        select: { id: true },
      });

      let unfreezePrice = await db.freezePrice.findFirst({
        where: { freezeDays: 0, price: 0 },
      });
      if (!unfreezePrice) {
        unfreezePrice = await db.freezePrice.create({
          data: { freezeDays: 0, price: 0, isActive: true },
        });
      }

      for (const sub of subsToUnfreeze) {
        // Calculate new endDate = now + remainingDays
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

        // Create UNFREEZE operation for audit trail
        if (adminUser) {
          await db.freezeOperation.create({
            data: {
              subscriptionId: sub.id,
              memberId: sub.memberId,
              operationType: "UNFREEZE",
              freezePriceId: unfreezePrice.id,
              price: 0,
              freezeDays: 0,
              performedById: adminUser.id,
            },
          });
        }

        autoUnfrozenCount++;
        console.log(
          `[CRON] Auto-unfroze subscription ${sub.id} (FIXED_DAYS expired). New endDate: ${newEndDate.toISOString()}`,
        );
      }
    }
    results.autoUnfrozen = autoUnfrozenCount;

    // ── 5. Activate scheduled future freezes whose frozenAt has arrived ──
    const scheduledFreezes = await db.subscription.updateMany({
      where: {
        isFrozen: false,
        deletedAt: null,
        frozenAt: { lte: now, not: null },
        freezeMode: { not: null },
      },
      data: { isFrozen: true },
    });
    results.scheduledFreezesActivated = scheduledFreezes.count;

    // ── Summary ──
    const duration = Date.now() - runStart;
    const summary = {
      success: true,
      timestamp: now.toISOString(),
      durationMs: duration,
      results,
    };

    console.log(`[CRON] Subscription management completed in ${duration}ms:`, results);

    // Persist to Logs table for audit trail
    await logApiMutation({
      db,
      endpoint: "cron.subscriptionManagement",
      method: "POST",
      userId: null,
      requestData: { trigger: "scheduled", schedule: "every 6 hours" },
      responseData: results,
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
    }).catch(() => {}); // Don't let logging failure mask the original error

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