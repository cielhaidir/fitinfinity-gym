import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function truncateTables() {
  console.log("🗑️  Truncating tables...");
  await prisma.$executeRaw`TRUNCATE "RolePermission", "Permission" CASCADE`;
  console.log("✅ Tables truncated successfully!");
}

async function main() {
  // NOTE: Truncate dinonaktifkan agar permission role yang sudah ada tidak hilang.
  // Jalankan truncateTables() secara manual jika ingin full reset.
  // await truncateTables();

  // Create all permissions first
  const permissions = [
    // Attendance
    { name: "list:attendance" },
    { name: "get:attendance" },
    { name: "create:attendance" },
    
    // Balance Account
    { name: "list:balances" },
    { name: "show:balances" },
    { name: "create:balances" },
    { name: "update:balances" },
    { name: "delete:balances" },
    
    // Chart of Account
    { name: "list:coa" },
    { name: "show:coa" },
    { name: "create:coa" },
    { name: "update:coa" },
    { name: "delete:coa" },
    
    // Configuration Management
    { name: "update:config" },
    { name: "list:config" },
    
    // Class Management
    { name: "create:classes" },
    { name: "list:classes" },
    { name: "update:classes" },
    { name: "delete:classes" },
    { name: "create:class-registration" },
    
    // FC Member Management
    { name: "create:fc-member" },
    { name: "update:fc-member" },
    { name: "delete:fc-member" },
    { name: "show:fc-member" },
    { name: "list:fc-member" },
    
    // Email Management
    { name: "create:email" },
    { name: "update:email" },
    { name: "delete:email" },
    { name: "show:email" },
    { name: "list:email" },
    { name: "test:email" },
    { name: "activate:email" },
    
    // Employee Management
    { name: "list:employees" },
    { name: "create:employees" },
    { name: "update:employees" },
    { name: "delete:employees" },
    
    // Member Management
    { name: "create:member" },
    { name: "update:member" },
    { name: "delete:member" },
    { name: "show:member" },
    { name: "list:member" },

    
    // Payment Validation Management
    { name: "create:payment" },
    { name: "accept:payment" },
    { name: "decline:payment" },
    { name: "upload:payment" },
    { name: "show:payment" },
    { name: "list:payment" },
    
    // Package Management
    { name: "create:packages" },
    { name: "list:packages" },
    { name: "show:packages" },
    { name: "update:packages" },
    { name: "delete:packages" },
    
    // Profile Management
    { name: "list:profile" },
    { name: "update:profile" },
    { name: "show:profile" },
    
    // Session Management
    { name: "list:session" },
    { name: "create:session" },
    { name: "update:session" },
    { name: "delete:session" },
    
    // Reward Management
    { name: "list:reward" },
    { name: "create:reward" },
    { name: "update:reward" },
    { name: "delete:reward" },
    { name: "claim:reward" },
    
    // Subscription Management
    { name: "create:subscription" },
    { name: "show:subscription" },
    { name: "list:subscription" },
    { name: "update:subscription" },
    { name: "delete:subscription" },
    
    // Transaction Management
    { name: "create:transaction" },
    { name: "update:transaction" },
    { name: "list:transaction" },
    { name: "delete:transaction" },
    
    // Trainer Management
    { name: "list:trainers" },
    { name: "show:trainers" },
    { name: "create:trainers" },
    { name: "update:trainers" },
    { name: "delete:trainers" },
    
    // Post Management
    { name: "create:post" },
    { name: "show:post" },
    { name: "list:post" },
    
    // User Management
    { name: "update:user" },
    { name: "delete:user" },
    { name: "show:user" },
    { name: "list:user" },
    
    // WhatsApp Management
    { name: "send:whatsapp" },
    { name: "reset:whatsapp" },
    
    // Role-Permission Management
    { name: "create:role-permission" },
    { name: "update:role-permission" },
    { name: "delete:role-permission" },
    { name: "show:role-permission" },
    { name: "list:role-permission" },
    
    // Role Management
    { name: "create:role" },
    { name: "update:role" },
    { name: "delete:role" },
    { name: "show:role" },
    { name: "list:role" },
    
    // Permission Management
    { name: "create:permission" },
    { name: "update:permission" },
    { name: "delete:permission" },
    { name: "show:permission" },
    { name: "list:permission" },
    
    // Voucher Management
    { name: "list:voucher" },
    { name: "create:voucher" },
    { name: "update:voucher" },
    { name: "delete:voucher" },
    { name: "claim:voucher" },
    
    // POS Category Management
    { name: "list:pos-category" },
    { name: "create:pos-category" },
    { name: "update:pos-category" },
    { name: "delete:pos-category" },
    { name: "show:pos-category" },
    
    // POS Item Management
    { name: "list:pos-item" },
    { name: "create:pos-item" },
    { name: "update:pos-item" },
    { name: "delete:pos-item" },
    { name: "show:pos-item" },
    
    // POS Sale Management
    { name: "list:pos-sale" },
    { name: "create:pos-sale" },
    { name: "update:pos-sale" },
    { name: "delete:pos-sale" },
    { name: "show:pos-sale" },


    // Menu Permissions for Navigation
    { name: "menu:trainers" },
    { name: "menu:packages" },
    { name: "menu:classes" },
    { name: "menu:employees" },
    { name: "menu:user" },
    { name: "menu:voucher" },
    { name: "menu:role-permission" },
    { name: "menu:permission" },
    { name: "menu:role" },
    { name: "menu:fc-member" },
    { name: "menu:subscription" },
    { name: "menu:reward" },
    { name: "menu:pos-sale" },
    { name: "menu:pos-category" },
    { name: "menu:pos-item" },
    { name: "menu:payment" },
    { name: "menu:member" },
    { name: "menu:session" },
    { name: "menu:profile" },
    { name: "menu:balances" },
    { name: "menu:coa" },
    { name: "menu:transaction" },
    { name: "menu:payment-history" },
    { name: "menu:manage-classes" },
    { name: "menu:config" },
    { name: "menu:dashboard-fc" },
    { name: "menu:dashboard-pt" },
    { name: "menu:dashboard-finance" },
    { name: "menu:dashboard-admin" },
    { name: "menu:dashboard-member" },
    { name: "menu:profile-pt" },
    { name: "menu:schedule-pt" },
    { name: "menu:member-list-pt" },
    { name: "menu:manage-fc" },
    { name: "member:profile" },
    { name: "member:body-composition" },
    
    { name: "menu:groups" },
    { name: "menu:group-management" },
    { name: "manage:groups" },
    { name: "manage:member" },



    { name: "show:membership" },
    { name: "show:attedance" },
    
    // Administration Menus
    { name: "menu:class-attendance" },
    { name: "menu:package-management" },
    { name: "menu:personal-trainer-management" },

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
    
    // Supplier Management
    { name: "menu:supplier" },
    { name: "list:supplier" },
    { name: "show:supplier" },
    { name: "create:supplier" },
    { name: "update:supplier" },
    { name: "delete:supplier" },
    
    // Inventory Management
    { name: "menu:inventory" },
    { name: "list:inventory" },
    { name: "create:inventory-adjustment" },
    
    // Purchase Order Management
    { name: "menu:purchase-order" },
    { name: "list:purchase-order" },
    { name: "show:purchase-order" },
    { name: "create:purchase-order" },
    { name: "update:purchase-order" },
    { name: "delete:purchase-order" },
    { name: "receive:purchase-order" },

    // System Logs
    { name: "list:logs" },

    // Advanced subscription editing (admin-only)
    { name: "edit:subscription-advanced" },

    // Freeze Price Management (admin-only, separate from subscription permissions)
    { name: "create:freeze-price" },
    { name: "update:freeze-price" },
    { name: "delete:freeze-price" },
    { name: "list:freeze-price" },
    { name: "show:freeze-price" },

    // Class Visit (pay-per-class untuk non-member)
    { name: "manage:class-visit" },
    { name: "request:class-visit" },

    // Corporate Management
    { name: "manage:corporate" },
    { name: "list:corporate" },

    // Subscription checkout (member self-service)
    { name: "checkout:subscription" },
  ];

  console.log("🌱 Seeding permissions...");
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: { name: permission.name },
    });
  }

  // Create roles with their permissions
  const roles = [
    {
      name: "Admin",
      permissions: permissions.map((p) => p.name), // Admin gets all permissions
    },
    {
      name: "Inventory Manager",
      permissions: [
        "show:user",
        "show:profile",
        "update:profile",
        
        // Supplier permissions
        "menu:supplier",
        "list:supplier",
        "show:supplier",
        "create:supplier",
        "update:supplier",
        "delete:supplier",
        
        // Inventory permissions
        "menu:inventory",
        "list:inventory",
        "create:inventory-adjustment",
        
        // Purchase order permissions
        "menu:purchase-order",
        "list:purchase-order",
        "show:purchase-order",
        "create:purchase-order",
        "update:purchase-order",
        "delete:purchase-order",
        "receive:purchase-order",
        
        // POS item read permissions
        "list:pos-item",
        "show:pos-item",
        "list:pos-category",
        "show:pos-category",
        
        // Report permissions
        "report:inventory",
        "report:stock-movement",
        "report:purchase-order",
      ],
    },
    {
      name: "Member",
      permissions: [
        "menu:classes",
        "menu:session",
        "menu:payment-history",
        "menu:dashboard-member",
        
        "update:profile",
        "show:profile",
        "show:user",
        "show:packages",
        "show:attedance",
        "show:member",
        "show:payment",
        "create:payment",

        "list:reward",
        "list:session",
        "list:trainers",
        "list:packages",
        "list:voucher",
        "list:subscription",
        "list:classes",
        
        "create:subscription",
        "update:subscription",
        "show:subscription",
        "update:subscription",
        

        "claim:reward",
        "upload:payment",
        "update:profile",
        "checkout:subscription",
        "create:class-registration",
        "member:body-composition",
        "request:class-visit"
      ],
    },
    {
      name: "Personal Trainer",
      permissions: [
        "menu:dashboard-pt",
        "menu:profile-pt",
        "menu:schedule-pt",
        "menu:member-list-pt",

        "list:session",
        "create:session",
        "update:session",
        "delete:session",

        "list:trainers",
        "show:trainers",


        "show:user",
        "show:profile",
        "update:profile",
      ],
    },
    {
      name: "Fitness Consultant",
      permissions: [
        "menu:fc-member",
        "menu:dashboard-fc",

        "create:fc-member",
        "update:fc-member",
        "delete:fc-member",
        "show:fc-member",
        "list:fc-member",
        "list:packages",
        "show:packages",

        "show:user",
        "show:profile",
        "update:profile",
      ],
    },
    {
      name: "Employee",
      permissions: [
        "show:user",
        "show:profile",
        "update:profile",


       
      ],
    },
    {
      name: "Finance",
      permissions: [
        "menu:balances",
        "list:balances",
        "show:balances",
        "create:balances",
        "update:balances",
        "delete:balances",
        "menu:coa",
        "list:coa",
        "show:coa",
        "create:coa",
        "update:coa",
        "delete:coa",
        "menu:payment",
        "list:payment",
        "show:payment",
        "accept:payment",
        "decline:payment",
        "menu:transaction",
        "create:transaction",
        "update:transaction",
        "list:transaction",
        "delete:transaction",
      ],
    },
    {
      name: "Customer Service",
      permissions: [
        // Basic profile
        "show:user",
        "show:profile",
        "update:profile",

        // Dashboard & navigation
        "menu:dashboard-admin",
        "menu:member",
        "menu:subscription",
        "menu:payment",
        "menu:transaction",
        "menu:reward",
        "menu:pos-sale",
        "menu:pos-category",
        "menu:pos-item",
        "menu:class-attendance",

        // Member management (read + update)
        "list:member",
        "show:member",
        "update:member",
        "show:membership",
        "show:attedance",

        // Subscription (create, read, update — date edit & PT transfer restricted at UI level)
        "create:subscription",
        "list:subscription",
        "show:subscription",
        "update:subscription",

        // Freeze (uses update:subscription) + freeze price lookup
        "list:freeze-price",
        "show:freeze-price",

        // POS (create, read, update)
        "list:pos-item",
        "show:pos-item",
        "create:pos-item",
        "update:pos-item",
        "list:pos-category",
        "show:pos-category",
        "create:pos-category",
        "update:pos-category",
        "list:pos-sale",
        "show:pos-sale",
        "create:pos-sale",
        "update:pos-sale",

        // Class registration & attendance (create, read, update)
        "list:classes",
        "create:class-registration",
        "create:classes",
        "update:classes",

        // Payment (read)
        "list:payment",
        "show:payment",
        "accept:payment",
        "decline:payment",

        // Supporting data (read only)
        "list:trainers",
        "show:trainers",
        "list:packages",
        "show:packages",
        "list:balances",
        "list:reward",
        "list:voucher",
        "list:employees",

        // All reports (read only)
        "report:member-attendance",
        "report:active-membership",
        "report:member-profile",
        "report:pt-remaining-sessions",
        "report:employees",
        "report:class-member-report",
        "report:class-session",
        "report:pt",
        "report:sales",
        "report:commission",
        "report:voucher",
        "report:cash-bank",
        "report:inventory",
        "report:stock-movement",
        "report:purchase-order",
        "member:body-composition",

        // Class Visit management
        "manage:class-visit",
        "request:class-visit",

        // Corporate (read for filters, manage untuk CS)
        "list:corporate",
        "manage:corporate",
      ],
    },
  ];

  console.log("🌱 Seeding roles and their permissions...");
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name },
    });

    // Assign permissions to role (upsert ensures new permissions are always added)
    for (const permissionName of role.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: createdRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: createdRole.id,
            permissionId: permission.id,
          },
        });
      } else {
        console.warn(`⚠️ Permission "${permissionName}" not found for role "${role.name}"`);
      }
    }
  }

  // Create admin user if it doesn't exist
  const adminPassword = await hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@fitinfinity.com" },
    update: {},
    create: {
      email: "admin@fitinfinity.com",
      name: "Admin",
      password: adminPassword,
      roles: {
        connect: {
          name: "Admin",
        },
      },
    },
  });

  // Seed email templates
  console.log("🌱 Seeding email templates...");
  const passwordResetHtml = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>',
    '<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">',
    '<tr><td style="background:#1a1a1a;padding:30px;text-align:center;">',
    '<img src="{{logoUrl}}" alt="FitInfinity" style="height:40px;" />',
    '</td></tr>',
    '<tr><td style="padding:40px 30px;">',
    '<h1 style="color:#1a1a1a;font-size:24px;margin:0 0 20px;">Reset Your Password</h1>',
    '<p style="color:#555;font-size:16px;line-height:1.6;">Hi {{name}},</p>',
    '<p style="color:#555;font-size:16px;line-height:1.6;">We received a request to reset your password. Click the button below to set a new password:</p>',
    '<div style="text-align:center;margin:30px 0;">',
    '<a href="{{resetUrl}}" style="background:#BAD45E;color:#1a1a1a;padding:14px 40px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;display:inline-block;">Reset Password</a>',
    '</div>',
    '<p style="color:#555;font-size:14px;line-height:1.6;">This link will expire in <strong>{{expiryTime}} hours</strong>.</p>',
    '<p style="color:#555;font-size:14px;line-height:1.6;">If you did not request a password reset, please ignore this email.</p>',
    '<hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />',
    '<p style="color:#999;font-size:12px;">If the button above does not work, copy and paste this URL into your browser:</p>',
    '<p style="color:#BAD45E;font-size:12px;word-break:break-all;">{{resetUrl}}</p>',
    '</td></tr>',
    '<tr><td style="background:#1a1a1a;padding:20px 30px;text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">&copy; {{currentYear}} FitInfinity. All rights reserved.</p>',
    '<p style="color:#888;font-size:12px;margin:5px 0 0;">{{address}}</p>',
    '</td></tr></table></body></html>',
  ].join('\n');

  await prisma.emailTemplate.upsert({
    where: { name: "Password Reset" },
    update: {
      htmlContent: passwordResetHtml,
      subject: "Reset Your Password - FitInfinity",
    },
    create: {
      name: "Password Reset",
      type: "PASSWORD_RESET",
      subject: "Reset Your Password - FitInfinity",
      htmlContent: passwordResetHtml,
      textContent: "Hi {{name}}, click this link to reset your password: {{resetUrl}} - This link expires in {{expiryTime}} hours.",
      variables: ["name", "resetUrl", "email", "expiryTime", "supportEmail", "supportPhone", "logoUrl", "currentYear", "address"],
      isActive: true,
    },
  });
  console.log("✅ Email templates seeded!");

  console.log("✅ Seeding completed!");
  console.log("👤 Admin user created:");
  console.log("Email: admin@fitinfinity.com");
  console.log("Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
