/**
 * Backfill Subscription.isComplimentary for existing data.
 *
 * Marks as complimentary:
 *  1. Subscriptions created as promo bonus (PromoRedemption.bonusSubscriptionId)
 *  2. Subscriptions whose payments (non-deleted) ALL have totalPayment = 0
 *
 * Does NOT touch subscriptions with no payment records at all
 * (likely legacy imports / group members paid via lead).
 *
 * Also normalizes Payment.paidAt for SUCCESS payments so paidAt-based
 * dashboards agree with createdAt-based reports:
 *  3. paidAt IS NULL            -> paidAt = createdAt   (always, with --apply)
 *  4. day(paidAt) != day(createdAt) -> paidAt = createdAt (only with --realign-paidat)
 *     Legacy rows stamped paidAt = "admin accept time" instead of the real payment date.
 *
 * Also backfills FreezeOperation.freezeStartAt:
 *  5. Latest FREEZE op per subscription whose freeze is still active/scheduled
 *     (Subscription.frozenAt not null) -> freezeStartAt = Subscription.frozenAt.
 *     Older/unfrozen ops keep NULL; the API falls back to performedAt.
 *
 * Usage:
 *   npx tsx scripts/backfill-complimentary.ts                          # dry run
 *   npx tsx scripts/backfill-complimentary.ts --apply                  # write changes
 *   npx tsx scripts/backfill-complimentary.ts --apply --realign-paidat # also fix step 4
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const REALIGN_PAIDAT = process.argv.includes("--realign-paidat");

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

async function main() {
  // 1. Promo bonus subs
  const promoRows = await prisma.promoRedemption.findMany({
    where: { bonusSubscriptionId: { not: null } },
    select: { bonusSubscriptionId: true, promo: { select: { name: true } } },
  });
  const promoMap = new Map<string, string>();
  for (const r of promoRows) promoMap.set(r.bonusSubscriptionId!, `Bonus promo "${r.promo.name}"`);

  // 2. Zero-paid subs
  const subs = await prisma.subscription.findMany({
    where: { deletedAt: null, isComplimentary: false },
    select: {
      id: true,
      payments: { where: { deletedAt: null }, select: { totalPayment: true } },
    },
  });

  const targets: { id: string; note: string }[] = [];
  for (const s of subs) {
    if (promoMap.has(s.id)) {
      targets.push({ id: s.id, note: promoMap.get(s.id)! });
    } else if (s.payments.length > 0 && s.payments.every((p) => p.totalPayment === 0)) {
      targets.push({ id: s.id, note: "Diskon 100%" });
    }
  }

  const fromPromo = targets.filter((t) => t.note.startsWith("Bonus promo")).length;
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}${REALIGN_PAIDAT ? " (+ realign paidAt)" : ""}`);
  console.log(`Subscriptions to mark complimentary: ${targets.length}`);
  console.log(`  from promo:        ${fromPromo}`);
  console.log(`  100% discount:     ${targets.length - fromPromo}`);

  // 3 & 4. paidAt normalization
  const successPayments = await prisma.payment.findMany({
    where: { status: "SUCCESS", deletedAt: null },
    select: { id: true, createdAt: true, paidAt: true },
  });
  const nullPaidAt = successPayments.filter((p) => p.paidAt === null);
  const misaligned = successPayments.filter(
    (p) => p.paidAt !== null && !sameDay(p.paidAt, p.createdAt),
  );
  console.log(`\nSUCCESS payments with paidAt NULL:              ${nullPaidAt.length} (will set paidAt = createdAt)`);
  console.log(`SUCCESS payments with paidAt on a different day: ${misaligned.length} (${REALIGN_PAIDAT ? "will" : "use --realign-paidat to"} set paidAt = createdAt)`);

  // 5. freezeStartAt for active/scheduled freezes
  const frozenSubs = await prisma.subscription.findMany({
    where: { deletedAt: null, frozenAt: { not: null } },
    select: {
      id: true,
      frozenAt: true,
      freezeOperations: {
        where: { operationType: "FREEZE", freezeStartAt: null },
        orderBy: { performedAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  const freezeOpTargets = frozenSubs
    .filter((s) => s.freezeOperations.length > 0 && s.frozenAt)
    .map((s) => ({ opId: s.freezeOperations[0]!.id, freezeStartAt: s.frozenAt! }));
  console.log(`\nFREEZE operations to backfill freezeStartAt:     ${freezeOpTargets.length}`);

  if (!APPLY) {
    console.log("\nRe-run with --apply to write changes.");
    return;
  }

  let updated = 0;
  for (const t of targets) {
    await prisma.subscription.update({
      where: { id: t.id },
      data: { isComplimentary: true, complimentaryNote: t.note },
    });
    updated++;
  }
  console.log(`\nUpdated ${updated} subscriptions.`);

  const paidAtTargets = REALIGN_PAIDAT ? [...nullPaidAt, ...misaligned] : nullPaidAt;
  let paidAtUpdated = 0;
  for (const p of paidAtTargets) {
    await prisma.payment.update({
      where: { id: p.id },
      data: { paidAt: p.createdAt },
    });
    paidAtUpdated++;
  }
  console.log(`Updated paidAt on ${paidAtUpdated} payments.`);

  let freezeOpsUpdated = 0;
  for (const t of freezeOpTargets) {
    await prisma.freezeOperation.update({
      where: { id: t.opId },
      data: { freezeStartAt: t.freezeStartAt },
    });
    freezeOpsUpdated++;
  }
  console.log(`Updated freezeStartAt on ${freezeOpsUpdated} freeze operations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
