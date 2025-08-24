import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedClasses() {
  console.log("🌱 Seeding classes...");

  // Delete existing classes
  await prisma.class.deleteMany({});
  console.log("🗑️ Cleared existing classes");

  const now = new Date();
  
  // Create classes for today
  const todayClasses = [
    {
      name: "yoga" as const,
      limit: 15,
      instructorName: "Sarah Johnson",
      schedule: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0), // Today 9:00 AM
      duration: 60,
      price: 150000,
    },
    {
      name: "zumba" as const,
      limit: 20,
      instructorName: "Maria Rodriguez", 
      schedule: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 30), // Today 6:30 PM
      duration: 45,
      price: 120000,
    },
    {
      name: "bootcamp" as const,
      limit: 12,
      instructorName: "David Wilson",
      schedule: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30), // Today 7:30 PM
      duration: 75,
      price: 200000,
    },
  ];

  // Create classes for yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdayClasses = [
    {
      name: "poundfit" as const,
      limit: 18,
      instructorName: "Jessica Chen",
      schedule: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 10, 0), // Yesterday 10:00 AM
      duration: 45,
      price: 140000,
    },
    {
      name: "kpop dance" as const,
      limit: 25,
      instructorName: "Kim Min-jun",
      schedule: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0), // Yesterday 5:00 PM
      duration: 50,
      price: 160000,
    },
    {
      name: "muaythai" as const,
      limit: 10,
      instructorName: "Alex Thompson",
      schedule: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 20, 0), // Yesterday 8:00 PM
      duration: 90,
      price: 250000,
    },
  ];

  // Create classes for tomorrow 
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tomorrowClasses = [
    {
      name: "vinyasa yoga" as const,
      limit: 12,
      instructorName: "Emma Davis",
      schedule: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0), // Tomorrow 8:00 AM
      duration: 60,
      price: 170000,
    },
    {
      name: "bodycombat" as const,
      limit: 15,
      instructorName: "Michael Brown",
      schedule: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 19, 0), // Tomorrow 7:00 PM
      duration: 90,
      price: 220000,
    },
  ];

  // Insert all classes
  const allClasses = [...todayClasses, ...yesterdayClasses, ...tomorrowClasses];
  
  for (const classData of allClasses) {
    await prisma.class.create({
      data: classData,
    });
    console.log(`✅ Created class: ${classData.name} by ${classData.instructorName} at ${classData.schedule}`);
  }

  console.log(`🎉 Successfully seeded ${allClasses.length} classes!`);
}

seedClasses()
  .catch((e) => {
    console.error("❌ Error seeding classes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });