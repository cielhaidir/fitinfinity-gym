import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { emailService } from "@/lib/email/emailService";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Cron Job: H-7 Membership Expiry Reminder
 *
 * Sends an email to members whose GYM_MEMBERSHIP subscription
 * expires exactly 7 days from today (WIB UTC+8).
 *
 * Anti-duplicate: uses reminderStage on the Subscription record.
 *   reminderStage = null → belum pernah dikirimi
 *   reminderStage = 1    → H-7 sudah terkirim
 *
 * Schedule: run daily at 08:00 WIB
 * Auth: Bearer CRON_SECRET_TOKEN header
 */

// ── Format nomor WA ke internasional tanpa +/spasi ─────────────────────────
function buildWaUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

// ── Load & render fallback HTML dari file template ──────────────────────────
let _templateCache: string | null = null;
function getFallbackHtml(vars: Record<string, string>): string {
  if (!_templateCache) {
    try {
      _templateCache = readFileSync(
        join(process.cwd(), "src/lib/email/templates/subscription-expiry.html"),
        "utf-8",
      );
    } catch {
      _templateCache = `<p>Halo <strong>{{memberName}}</strong>, membership <strong>{{packageName}}</strong> akan berakhir pada <strong>{{expiryDate}}</strong>. <a href="{{renewalUrl}}">Perpanjang sekarang</a>.</p>`;
    }
  }
  return _templateCache.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function POST(request: NextRequest) {
  const runStart = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Hitung window H-7 dalam WIB (UTC+8) ─────────────────────────────────
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + 8 * 60 * 60 * 1000);
  const targetWib = addDays(nowWib, 7);

  // Window: mulai 00:00:00 WIB hingga 23:59:59 WIB di hari H+7
  const windowStart = new Date(
    Date.UTC(
      targetWib.getUTCFullYear(),
      targetWib.getUTCMonth(),
      targetWib.getUTCDate(),
      0,
      0,
      0,
    ) -
      8 * 60 * 60 * 1000,
  );
  const windowEnd = new Date(
    Date.UTC(
      targetWib.getUTCFullYear(),
      targetWib.getUTCMonth(),
      targetWib.getUTCDate(),
      23,
      59,
      59,
    ) -
      8 * 60 * 60 * 1000,
  );

  const results = { sent: 0, skipped: 0, errors: 0 };
  const errorDetails: string[] = [];

  try {
    // ── Cari subscription GYM_MEMBERSHIP yang akan expired H+7 ──────────
    const subscriptions = await db.subscription.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        isFrozen: false,
        endDate: { gte: windowStart, lte: windowEnd },
        package: { type: "GYM_MEMBERSHIP" },
        // Belum pernah dapat H-7 reminder (reminderStage null atau 0)
        OR: [{ reminderStage: null }, { reminderStage: 0 }],
      },
      include: {
        member: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        package: { select: { name: true } },
      },
    });

    // ── Cari template SUBSCRIPTION_EXPIRY di DB (opsional) ──────────────
    const dbTemplate = await db.emailTemplate.findFirst({
      where: { type: "SUBSCRIPTION_EXPIRY", isActive: true },
    });

    // ── Ambil config aktif untuk supportEmail/Phone ───────────────────────
    const emailConfig = await db.emailConfig.findFirst({
      where: { isActive: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://fitinfinity.com";
    const supportEmail = emailConfig?.supportEmail ?? "support@fitinfinity.com";
    const supportPhone = emailConfig?.supportPhone ?? "-";
    const logoUrl = emailConfig?.logoUrl ?? "";
    const address = emailConfig?.businessAddress ?? "";

    // ── Kirim email satu per satu ─────────────────────────────────────────
    for (const sub of subscriptions) {
      const memberEmail = sub.member?.user?.email;
      const memberName = sub.member?.user?.name ?? "Member";
      const packageName = sub.package?.name ?? "Gym Membership";
      const expiryDate = sub.endDate
        ? format(sub.endDate, "d MMMM yyyy", { locale: localeId })
        : "-";
      const renewalUrl = `${baseUrl}/member/payment-history`;
      const waMessage = `Halo Admin, saya\nNama : ${memberName}\nEmail : ${memberEmail}\nPaket yang akan expired : ${packageName}\n\nIngin melakukan renewal, apakah bisa dibantu?`;
      const waUrl = buildWaUrl(supportPhone, waMessage);

      if (!memberEmail) {
        results.skipped++;
        continue;
      }

      try {
        if (dbTemplate?.id) {
          // Gunakan template dari DB
          await emailService.sendEmail({
            to: memberEmail,
            templateId: dbTemplate.id,
            templateData: {
              memberName,
              memberEmail,
              packageName,
              expiryDate,
              renewalUrl,
              waUrl,
              logoUrl,
              supportEmail,
              supportPhone,
              address,
              currentYear: new Date().getFullYear().toString(),
            },
          });
        } else {
          // Fallback: render dari file template HTML
          await emailService.sendEmail({
            to: memberEmail,
            subject: `⏰ Membership kamu akan habis dalam 7 hari — ${packageName}`,
            html: getFallbackHtml({
              memberName,
              memberEmail,
              packageName,
              expiryDate,
              renewalUrl,
              waUrl,
              logoUrl,
              supportEmail,
              supportPhone,
              address,
              currentYear: new Date().getFullYear().toString(),
            }),
          });
        }

        // Tandai sudah dikirimi (reminderStage = 1)
        await db.subscription.update({
          where: { id: sub.id },
          data: {
            isReminder: true,
            reminderAt: nowUtc,
            reminderStage: 1,
          },
        });

        results.sent++;
        console.log(`[CRON:expiry-reminder] Sent H-7 reminder → ${memberEmail} (sub: ${sub.id})`);
      } catch (err) {
        results.errors++;
        const msg = err instanceof Error ? err.message : "Unknown error";
        errorDetails.push(`${memberEmail}: ${msg}`);
        console.error(`[CRON:expiry-reminder] Failed to send to ${memberEmail}:`, err);
      }
    }

    const duration = Date.now() - runStart;
    console.log(`[CRON:expiry-reminder] Done in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      timestamp: nowUtc.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      durationMs: duration,
      results,
      ...(errorDetails.length > 0 && { errorDetails }),
    });
  } catch (error) {
    const duration = Date.now() - runStart;
    console.error("[CRON:expiry-reminder] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
      },
      { status: 500 },
    );
  }
}

// GET — health check & dokumentasi
export async function GET() {
  return NextResponse.json({
    message: "H-7 Membership Expiry Reminder Cron",
    endpoint: "/api/cron/expiry-reminder",
    method: "POST",
    schedule: "Daily at 08:00 WIB",
    auth: "Authorization: Bearer CRON_SECRET_TOKEN",
    logic: [
      "Find active GYM_MEMBERSHIP subscriptions expiring in 7 days (WIB)",
      "Skip if reminderStage >= 1 (already notified)",
      "Send SUBSCRIPTION_EXPIRY email (DB template or fallback HTML)",
      "Mark subscription: isReminder=true, reminderStage=1",
    ],
  });
}
