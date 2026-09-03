/**
 * Safe permission seeder — ONLY adds new permissions and role-permission assignments.
 * Does NOT modify users, memberships, email templates, or any other data.
 * Uses upsert so existing data is never overwritten.
 *
 * Usage: npx tsx prisma/seed-permissions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Full permission list (same as seed.ts) ─────────────────────
  const permissions = [
    // User
    { name: "create:user" },
    { name: "show:user" },
    { name: "update:user" },
    { name: "delete:user" },

    // Profile
    { name: "show:profile" },
    { name: "update:profile" },

    // Member
    { name: "create:member" },
    { name: "show:member" },
    { name: "update:member" },
    { name: "delete:member" },
    { name: "list:member" },

    // Membership
    { name: "show:membership" },
    { name: "show:attedance" },

    // Personal Trainer
    { name: "list:trainers" },
    { name: "show:trainers" },
    { name: "create:trainers" },
    { name: "update:trainers" },
    { name: "delete:trainers" },

    // Packages
    { name: "create:packages" },
    { name: "show:packages" },
    { name: "update:packages" },
    { name: "delete:packages" },
    { name: "list:packages" },

    // Class Management
    { name: "create:classes" },
    { name: "list:classes" },
    { name: "update:classes" },
    { name: "delete:classes" },
    { name: "create:class-registration" },

    // Subscription
    { name: "create:subscription" },
    { name: "list:subscription" },
    { name: "show:subscription" },
    { name: "update:subscription" },

    // Voucher
    { name: "create:voucher" },
    { name: "list:voucher" },
    { name: "update:voucher" },
    { name: "delete:voucher" },

    // Reward
    { name: "list:reward" },
    { name: "create:reward" },
    { name: "update:reward" },
    { name: "delete:reward" },
    { name: "claim:reward" },

    // Session
    { name: "create:session" },
    { name: "list:session" },
    { name: "update:session" },
    { name: "delete:session" },

    // Payment
    { name: "create:payment" },
    { name: "list:payment" },
    { name: "show:payment" },
    { name: "accept:payment" },
    { name: "decline:payment" },
    { name: "upload:payment" },

    // Employee
    { name: "list:employees" },
    { name: "create:employees" },
    { name: "update:employees" },
    { name: "delete:employees" },

    // Reports
    { name: "report:member-attendance" },
    { name: "report:active-membership" },
    { name: "report:member-profile" },
    { name: "report:pt-remaining-sessions" },
    { name: "report:employees" },
    { name: "report:class-member-report" },
    { name: "report:class-session" },
    { name: "report:pt" },
    { name: "report:sales" },
    { name: "report:commission" },
    { name: "report:voucher" },
    { name: "report:cash-bank" },
    { name: "report:inventory" },
    { name: "report:stock-movement" },
    { name: "report:purchase-order" },

    // Menu
    { name: "menu:dashboard-admin" },
    { name: "menu:dashboard-member" },
    { name: "menu:dashboard-pt" },
    { name: "menu:dashboard-fc" },
    { name: "menu:trainers" },
    { name: "menu:packages" },
    { name: "menu:member" },
    { name: "menu:subscription" },
    { name: "menu:voucher" },
    { name: "menu:user" },
    { name: "menu:manage-classes" },
    { name: "menu:session" },
    { name: "menu:classes" },
    { name: "menu:role-permission" },
    { name: "menu:permission" },
    { name: "menu:role" },
    { name: "menu:payment-history" },
    { name: "menu:employees" },
    { name: "menu:manage-fc" },
    { name: "menu:config" },
    { name: "menu:payment" },
    { name: "menu:transaction" },
    { name: "menu:reward" },
    { name: "menu:profile-pt" },
    { name: "menu:schedule-pt" },
    { name: "menu:member-list-pt" },
    { name: "menu:fc-member" },
    { name: "menu:class-attendance" },
    { name: "menu:group-management" },
    { name: "menu:groups" },
    { name: "member:profile" },

    // POS
    { name: "menu:pos-sale" },
    { name: "menu:pos-category" },
    { name: "menu:pos-item" },
    { name: "list:pos-item" },
    { name: "show:pos-item" },
    { name: "create:pos-item" },
    { name: "update:pos-item" },
    { name: "delete:pos-item" },
    { name: "list:pos-category" },
    { name: "show:pos-category" },
    { name: "create:pos-category" },
    { name: "update:pos-category" },
    { name: "delete:pos-category" },
    { name: "list:pos-sale" },
    { name: "show:pos-sale" },
    { name: "create:pos-sale" },
    { name: "update:pos-sale" },

    // Balance / COA / Transaction / Finance
    { name: "menu:balances" },
    { name: "list:balances" },
    { name: "show:balances" },
    { name: "create:balances" },
    { name: "update:balances" },
    { name: "delete:balances" },
    { name: "menu:coa" },
    { name: "list:coa" },
    { name: "show:coa" },
    { name: "create:coa" },
    { name: "update:coa" },
    { name: "delete:coa" },
    { name: "create:transaction" },
    { name: "update:transaction" },
    { name: "list:transaction" },
    { name: "delete:transaction" },

    // FC Member
    { name: "create:fc-member" },
    { name: "update:fc-member" },
    { name: "delete:fc-member" },
    { name: "show:fc-member" },
    { name: "list:fc-member" },

    // Body composition
    { name: "member:body-composition" },

    // Freeze price
    { name: "list:freeze-price" },
    { name: "show:freeze-price" },
    { name: "create:freeze-price" },
    { name: "update:freeze-price" },
    { name: "delete:freeze-price" },

    // System logs
    { name: "list:logs" },

    // Supplier
    { name: "menu:supplier" },
    { name: "list:supplier" },
    { name: "show:supplier" },
    { name: "create:supplier" },
    { name: "update:supplier" },
    { name: "delete:supplier" },

    // Inventory
    { name: "menu:inventory" },
    { name: "list:inventory" },
    { name: "create:inventory-adjustment" },

    // Purchase Order
    { name: "menu:purchase-order" },
    { name: "list:purchase-order" },
    { name: "show:purchase-order" },
    { name: "create:purchase-order" },
    { name: "update:purchase-order" },
    { name: "delete:purchase-order" },
    { name: "receive:purchase-order" },

    // Class Visit management
    { name: "manage:class-visit" },
    { name: "request:class-visit" },

    // Corporate management
    { name: "list:corporate" },
    { name: "manage:corporate" },

    // Subscription checkout (member self-service)
    { name: "checkout:subscription" },

    // Cancel completed group class (refund sessions)
    { name: "cancel:completed-session" },

    // Instructor Management
    { name: "list:instructor" },
    { name: "create:instructor" },
    { name: "update:instructor" },
    { name: "delete:instructor" },
    { name: "report:instructor" },

    // Point History
    { name: "list:point-history" },
    { name: "adjust:point" },
  ];

  console.log("🔐 Seeding permissions...");
  let created = 0;
  let existing = 0;
  for (const permission of permissions) {
    const result = await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: { name: permission.name },
    });
    // Check if it was newly created by comparing createdAt ~ now
    const age = Date.now() - new Date(result.createdAt).getTime();
    if (age < 5000) {
      created++;
      console.log(`  ✅ NEW: ${permission.name}`);
    } else {
      existing++;
    }
  }
  console.log(`   ${created} new permissions, ${existing} already existed.\n`);

  // ── Role → Permission assignments ──────────────────────────────
  const rolePermissions: Record<string, string[]> = {
    Admin: permissions.map((p) => p.name), // Admin gets ALL

    "Inventory Manager": [
      "show:user", "show:profile", "update:profile",
      "menu:supplier", "list:supplier", "show:supplier", "create:supplier", "update:supplier", "delete:supplier",
      "menu:inventory", "list:inventory", "create:inventory-adjustment",
      "menu:purchase-order", "list:purchase-order", "show:purchase-order", "create:purchase-order", "update:purchase-order", "delete:purchase-order", "receive:purchase-order",
      "list:pos-item", "show:pos-item", "list:pos-category", "show:pos-category",
      "report:inventory", "report:stock-movement", "report:purchase-order",
    ],

    Member: [
      "menu:classes", "menu:session", "menu:payment-history", "menu:dashboard-member",
      "update:profile", "show:profile", "show:user", "show:packages", "show:attedance", "show:member", "show:payment", "create:payment",
      "list:reward", "list:session", "list:trainers", "list:packages", "list:voucher", "list:subscription", "list:classes",
      "create:subscription", "update:subscription", "show:subscription",
      "claim:reward", "upload:payment", "checkout:subscription", "create:class-registration", "member:body-composition", "request:class-visit",
    ],

    "Personal Trainer": [
      "menu:dashboard-pt", "menu:profile-pt", "menu:schedule-pt", "menu:member-list-pt",
      "list:session", "create:session", "update:session", "delete:session",
      "list:trainers", "show:trainers",
      "show:user", "show:profile", "update:profile",
    ],

    "Fitness Consultant": [
      "menu:fc-member", "menu:dashboard-fc",
      "create:fc-member", "update:fc-member", "delete:fc-member", "show:fc-member", "list:fc-member",
      "list:packages", "show:packages",
      "show:user", "show:profile", "update:profile",
    ],

    Employee: [
      "show:user", "show:profile", "update:profile",
    ],

    Finance: [
      "menu:balances", "list:balances", "show:balances", "create:balances", "update:balances", "delete:balances",
      "menu:coa", "list:coa", "show:coa", "create:coa", "update:coa", "delete:coa",
      "menu:payment", "list:payment", "show:payment", "accept:payment", "decline:payment",
      "menu:transaction", "create:transaction", "update:transaction", "list:transaction", "delete:transaction",
    ],

    "Customer Service": [
      "show:user", "show:profile", "update:profile",
      "menu:dashboard-admin", "menu:member", "menu:subscription", "menu:payment", "menu:transaction", "menu:reward", "menu:pos-sale", "menu:pos-category", "menu:pos-item", "menu:class-attendance", "menu:group-management",
      "list:member", "show:member", "update:member", "show:membership", "show:attedance",
      "create:subscription", "list:subscription", "show:subscription", "update:subscription",
      "list:freeze-price", "show:freeze-price",
      "list:pos-item", "show:pos-item", "create:pos-item", "update:pos-item",
      "list:pos-category", "show:pos-category", "create:pos-category", "update:pos-category",
      "list:pos-sale", "show:pos-sale", "create:pos-sale", "update:pos-sale",
      "list:classes", "create:class-registration", "create:classes", "update:classes",
      "create:session", "list:session", "update:session",
      "list:payment", "show:payment", "accept:payment", "decline:payment",
      "list:trainers", "show:trainers", "list:packages", "show:packages", "list:balances", "list:reward", "list:voucher", "list:employees",
      "report:member-attendance", "report:active-membership", "report:member-profile", "report:pt-remaining-sessions", "report:employees",
      "report:class-member-report", "report:class-session", "report:pt", "report:sales", "report:commission", "report:voucher",
      "report:cash-bank", "report:inventory", "report:stock-movement", "report:purchase-order",
      "member:body-composition",
      "manage:class-visit", "request:class-visit",
      "list:corporate", "manage:corporate",
      "list:instructor", "create:instructor", "update:instructor", "delete:instructor", "report:instructor",
      "list:point-history", "adjust:point",
    ],
  };

  console.log("🔗 Assigning permissions to roles...");
  for (const [roleName, perms] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.log(`  ⚠️  Role "${roleName}" not found — skipping`);
      continue;
    }

    let assigned = 0;
    for (const permName of perms) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) {
        console.log(`  ⚠️  Permission "${permName}" not found`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
      assigned++;
    }
    console.log(`  ✅ ${roleName}: ${assigned} permissions ensured`);
  }

  console.log("\n🎉 Permission seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
