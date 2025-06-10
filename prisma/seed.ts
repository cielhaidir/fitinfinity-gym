import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create all permissions first
  const permissions = [
    // Attendance
    { name: "list:attedance" },
    
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
        "list:classes",
        "regist:classes",
        "edit:profile",
        "list:profile",
        "list:packages",
        "show:packages",
        "claim:reward",
        "list:reward",
        "show:post",
        "list:post",
        "upload:payment",
        "list:session",
      ],
    },
    {
      name: "Finance",
      permissions: [
        "list:balances",
        "show:balances",
        "create:balances",
        "edit:balances",
        "delete:balances",
        "list:coa",
        "show:coa",
        "create:coa",
        "edit:coa",
        "delete:coa",
        "list:payment",
        "show:payment",
        "accept:payment",
        "decline:payment",
        "create:transaction",
        "edit:transaction",
        "list:transaction",
        "delete:transaction",
      ],
    },
    {
      name: "Personal Trainer",
      permissions: [
        "list:session",
        "create:session",
        "edit:session",
        "delete:session",
        "list:profile",
        "edit:profile",
        "show:member",
        "list:member",
      ],
    },
    {
      name: "Fitness Consultant",
      permissions: [
        "create:fc-member",
        "edit:fc-member",
        "delete:fc-member",
        "show:fc-member",
        "list:fc-member",
        "list:packages",
        "show:packages",
      ],
    },
    {
      name: "Customer Service",
      permissions: [
        "list:member",
        "show:member",
        "list:packages",
        "show:packages",
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
