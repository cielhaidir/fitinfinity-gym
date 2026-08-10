/**
 * Backfill script: fill Payment.paidAt for historical SUCCESS payments that
 * were created before paidAt was stamped on creation.
 *
 * Sets paidAt = createdAt for every payment where:
 *   status = 'SUCCESS' AND paidAt IS NULL AND deletedAt IS NULL
 *
 * Safe to run multiple times (idempotent — only touches rows with paidAt NULL).
 *
 * Usage:
 *   npx tsx scripts/backfill-payment-paidat.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.payment.count({
    where: { status: "SUCCESS", paidAt: null, deletedAt: null },
  });
  console.log(`SUCCESS payments with paidAt = NULL (not deleted): ${before}`);

  if (before === 0) {
    console.log("Nothing to backfill. Done.");
    return;
  }

  const affected = await prisma.$executeRaw`
    UPDATE "Payment"
    SET "paidAt" = "createdAt"
    WHERE "status"::text = 'SUCCESS'
      AND "paidAt" IS NULL
      AND "deletedAt" IS NULL
  `;
  console.log(`Backfilled ${affected} payment(s): paidAt <- createdAt`);

  const after = await prisma.payment.count({
    where: { status: "SUCCESS", paidAt: null, deletedAt: null },
  });
  console.log(`Remaining SUCCESS payments still NULL: ${after}`);
  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
