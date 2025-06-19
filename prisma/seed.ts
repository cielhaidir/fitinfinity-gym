import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function truncateTables() {
  console.log("🗑️  Truncating tables...");
  await prisma.$executeRaw`TRUNCATE "RolePermission", "Permission" CASCADE`;
  console.log("✅ Tables truncated successfully!");
}

async function main() {
  // Truncate tables before seeding
  await truncateTables();

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



    { name: "show:membership" },
    { name: "show:attedance" },
  

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
        "create:class-registration"
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
        "show:user",
        "show:profile",
        "update:profile",

        "menu:dashboard-admin",
        "menu:payment",
        "menu:member",
        "menu:reward",
        "menu:pos-sale",
        "menu:pos-category",
        "menu:pos-item",

        "list:member",
        "show:member",
        "update:member",

        "list:employees",
        "list:subscription",

        "list:pos-item",
        "show:pos-item",
        "create:pos-item",
        "update:pos-item",
        "delete:pos-item",

        "list:pos-category",
        "show:pos-category",
        "create:pos-category",
        "update:pos-category",
        "delete:pos-category",

        "list:pos-sale",
        "show:pos-sale",
        "create:pos-sale",
        "update:pos-sale",
        "delete:pos-sale",

        "list:balances",
        "list:trainers",
        "list:payment",
        "list:reward",
        
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
