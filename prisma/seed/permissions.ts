import { type PrismaClient } from "@prisma/client";

const permissions = [
  // Attendance
  "list:attedance",

  // Balance Account
  "list:balances",
  "show:balances",
  "create:balances",
  "edit:balances", 
  "delete:balances",

  // Chart of Account
  "list:coa",
  "show:coa",
  "create:coa",
  "edit:coa",
  "delete:coa",

  // Configuration
  "edit:config",
  "list:config",

  // Class Management
  "create:classes",
  "list:classes", 
  "edit:classes",
  "delete:classes",
  "regist:classes",

  // FC Member
  "create:fc-member",
  "edit:fc-member",
  "delete:fc-member", 
  "show:fc-member",
  "list:fc-member",

  // Email
  "create:email",
  "edit:email",
  "delete:email",
  "show:email",
  "list:email",
  "test:email",
  "activate:email",

  // Employee
  "list:employees",
  "create:employees",
  "edit:employees",
  "delete:employees",

  // Member
  "create:member",
  "edit:member",
  "delete:member",
  "show:member",
  "list:member",

  // Payment Validation
  "create:payment",
  "accept:payment",
  "decline:payment",
  "upload:payment",
  "show:payment",
  "list:payment",

  // Package
  "create:packages",
  "list:packages",
  "show:packages",
  "edit:packages",
  "delete:packages",

  // Profile
  "list:profile",
  "edit:profile",

  // Session
  "list:session",
  "create:session",
  "edit:session",
  "delete:session",

  // Reward
  "list:reward",
  "create:reward",
  "edit:reward",
  "delete:reward",
  "claim:reward",

  // Subscription
  "create:subscription",
  "show:subscription",
  "list:subscription",
  "edit:subscription",
  "delete:subscription",

  // Transaction
  "create:transaction",
  "edit:transaction",
  "list:transaction",
  "delete:transaction",

  // Trainer
  "list:trainers",
  "show:trainers",
  "create:trainers",
  "edit:trainers",
  "remove:trainers",
  "delete:trainers",

  // Post
  "create:post",
  "show:post",
  "list:post",

  // User
  "edit:user",
  "delete:user",
  "show:user",
  "list:user",

  // WhatsApp
  "send:whatsapp",
  "reset:whatsapp",

  // Role-Permission
  "create:role-permission",
  "edit:role-permission",
  "delete:role-permission",
  "show:role-permission",
  "list:role-permission",

  // Role
  "create:role",
  "edit:role",
  "delete:role",
  "show:role",
  "list:role",

  // Permission
  "create:permission",
  "edit:permission",
  "delete:permission",
  "show:permission",
  "list:permission",

  // Voucher
  "list:voucher",
  "create:voucher",
  "edit:voucher",
  "delete:voucher",
  "claim:voucher",

  // POS Category
  "list:pos-category",
  "create:pos-category",
  "edit:pos-category",
  "delete:pos-category",
  "show:pos-category",

  // POS Item
  "list:pos-item",
  "create:pos-item",
  "edit:pos-item",
  "delete:pos-item",
  "show:pos-item",

  // POS Sale
  "list:pos-sale",
  "create:pos-sale",
  "edit:pos-sale",
  "delete:pos-sale",
  "show:pos-sale",
];

export async function seedPermissions(prisma: PrismaClient) {
  console.log("Seeding permissions...");

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: {},
      create: { name: permission },
    });
  }

  console.log("✅ Permissions seeded");
}