import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create all permissions first
  const permissions = [
    // Attendance
    { name: "list:attedance" },
    { name: "get:attedance" },    
    // Balance Account
    { name: "list:balances" },
    { name: "show:balances" },
    { name: "create:balances" },
    { name: "edit:balances" },
    { name: "delete:balances" },
    
    // Chart of Account
    { name: "list:coa" },
    { name: "show:coa" },
    { name: "create:coa" },
    { name: "edit:coa" },
    { name: "delete:coa" },
    
    // Configuration Management
    { name: "edit:config" },
    { name: "list:config" },
    
    // Class Management
    { name: "create:classes" },
    { name: "list:classes" },
    { name: "edit:classes" },
    { name: "delete:classes" },
    { name: "regist:classes" },
    
    // FC Member Management
    { name: "create:fc-member" },
    { name: "edit:fc-member" },
    { name: "delete:fc-member" },
    { name: "show:fc-member" },
    { name: "list:fc-member" },
    
    // Email Management
    { name: "create:email" },
    { name: "edit:email" },
    { name: "delete:email" },
    { name: "show:email" },
    { name: "list:email" },
    { name: "test:email" },
    { name: "activate:email" },
    
    // Employee Management
    { name: "list:employees" },
    { name: "create:employees" },
    { name: "edit:employees" },
    { name: "delete:employees" },
    
    // Member Management
    { name: "create:member" },
    { name: "edit:member" },
    { name: "delete:member" },
    { name: "show:member" },
    { name: "list:member" },
    { name: "get:member" },
    
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
    { name: "edit:packages" },
    { name: "delete:packages" },
    
    // Profile Management
    { name: "list:profile" },
    { name: "edit:profile" },
    { name: "get:profile" },
    
    // Session Management
    { name: "list:session" },
    { name: "create:session" },
    { name: "edit:session" },
    { name: "delete:session" },
    
    // Reward Management
    { name: "list:reward" },
    { name: "create:reward" },
    { name: "edit:reward" },
    { name: "delete:reward" },
    { name: "claim:reward" },
    
    // Subscription Management
    { name: "create:subscription" },
    { name: "show:subscription" },
    { name: "list:subscription" },
    { name: "edit:subscription" },
    { name: "delete:subscription" },
    
    // Transaction Management
    { name: "create:transaction" },
    { name: "edit:transaction" },
    { name: "list:transaction" },
    { name: "delete:transaction" },
    
    // Trainer Management
    { name: "list:trainers" },
    { name: "show:trainers" },
    { name: "create:trainers" },
    { name: "edit:trainers" },
    { name: "remove:trainers" },
    { name: "delete:trainers" },
    
    // Post Management
    { name: "create:post" },
    { name: "show:post" },
    { name: "list:post" },
    
    // User Management
    { name: "edit:user" },
    { name: "delete:user" },
    { name: "show:user" },
    { name: "list:user" },
    
    // WhatsApp Management
    { name: "send:whatsapp" },
    { name: "reset:whatsapp" },
    
    // Role-Permission Management
    { name: "create:role-permission" },
    { name: "edit:role-permission" },
    { name: "delete:role-permission" },
    { name: "show:role-permission" },
    { name: "list:role-permission" },
    
    // Role Management
    { name: "create:role" },
    { name: "edit:role" },
    { name: "delete:role" },
    { name: "show:role" },
    { name: "list:role" },
    
    // Permission Management
    { name: "create:permission" },
    { name: "edit:permission" },
    { name: "delete:permission" },
    { name: "show:permission" },
    { name: "list:permission" },
    
    // Voucher Management
    { name: "list:voucher" },
    { name: "create:voucher" },
    { name: "edit:voucher" },
    { name: "delete:voucher" },
    { name: "claim:voucher" },
    
    // POS Category Management
    { name: "list:pos-category" },
    { name: "create:pos-category" },
    { name: "edit:pos-category" },
    { name: "delete:pos-category" },
    { name: "show:pos-category" },
    
    // POS Item Management
    { name: "list:pos-item" },
    { name: "create:pos-item" },
    { name: "edit:pos-item" },
    { name: "delete:pos-item" },
    { name: "show:pos-item" },
    
    // POS Sale Management
    { name: "list:pos-sale" },
    { name: "create:pos-sale" },
    { name: "edit:pos-sale" },
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
    { name: "menu:profile-pt" },
    { name: "menu:schedule-pt" },
    { name: "member:profile" },

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
      name: "Member",
      permissions: [
        "menu:classes",
        "edit:profile",
        "show:user",
        "show:packages",
        "claim:reward",
        "list:reward",
        "list:session",
        "get:member",
        "upload:payment",
        "menu:session",
        "get:membership",
        "menu:payment-history",
        "member:profile",
        "get:profile",
        "list:packages",
        "get:attedance"
      ],
    },
    {
      name: "Employee",
      permissions: [
        "edit:profile",
        "list:profile",
        "show:user",
        "list:attedance",
        "get:attedance",
      ],
    },
    {
      name: "Finance",
      permissions: [
        "menu:balances",
        "list:balances",
        "show:balances",
        "create:balances",
        "edit:balances",
        "delete:balances",
        "menu:coa",
        "list:coa",
        "show:coa",
        "create:coa",
        "edit:coa",
        "delete:coa",
        "menu:payment",
        "list:payment",
        "show:payment",
        "accept:payment",
        "decline:payment",
        "menu:transaction",
        "create:transaction",
        "edit:transaction",
        "list:transaction",
        "delete:transaction",
      ],
    },
    {
      name: "Personal Trainer",
      permissions: [
        "menu:session",
        "list:session",
        "create:session",
        "edit:session",
        "delete:session",
        "menu:profile",
        "list:profile",
        "edit:profile",
        "menu:member",
        "show:member",
        "list:member",
      ],
    },
    {
      name: "Fitness Consultant",
      permissions: [
        "menu:fc-member",
        "create:fc-member",
        "edit:fc-member",
        "delete:fc-member",
        "show:fc-member",
        "list:fc-member",
        "menu:packages",
        "list:packages",
        "show:packages",
      ],
    },
    {
      name: "Customer Service",
      permissions: [
        "menu:member",
        "list:member",
        "show:member",
        "menu:packages",
        "list:packages",
        "show:packages",
        "menu:payment",
        "list:payment",
        "show:payment",
        "send:whatsapp",
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

    // Assign permissions to role
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
