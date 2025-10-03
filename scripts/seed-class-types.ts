import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const classTypes = [
  {
    name: "yoga",
    icon: "fas fa-spa",
    description: "Improve flexibility, strength and mental focus with our yoga sessions.",
    level: "Easy"
  },
  {
    name: "zumba",
    icon: "fas fa-music",
    description: "Latin-inspired dance fitness that combines high-energy cardio with fun choreography.",
    level: "Medium"
  },
  {
    name: "poundfit",
    icon: "fas fa-drum",
    description: "High-energy cardio workout combining drumming and fitness for maximum calorie burn.",
    level: "Medium"
  },
  {
    name: "kpop dance",
    icon: "fas fa-star",
    description: "High-energy K-pop dance fitness combining Korean pop music with dynamic choreography.",
    level: "Hard"
  },
  {
    name: "bootcamp",
    icon: "fas fa-dumbbell",
    description: "Intense military-style training combining strength, cardio, and endurance exercises.",
    level: "Hard"
  },
  {
    name: "bodycombat",
    icon: "fas fa-fist-raised",
    description: "High-intensity martial arts training focusing on self-defense and combat techniques.",
    level: "Hard"
  },
  {
    name: "muaythai",
    icon: "fas fa-fist-raised",
    description: "Traditional Thai martial arts focusing on striking techniques and conditioning.",
    level: "Hard"
  },
  {
    name: "thaiboxig",
    icon: "fas fa-fist-raised",
    description: "Combat sport combining boxing with kicks and clinch work.",
    level: "Hard"
  },
  {
    name: "mat pilates",
    icon: "fas fa-leaf",
    description: "Low-impact exercise focusing on core strength, flexibility, and body alignment.",
    level: "Easy"
  },
  {
    name: "vinyasa yoga",
    icon: "fas fa-spa",
    description: "Dynamic yoga practice linking movement with breath.",
    level: "Medium"
  },
  {
    name: "hatha yoga",
    icon: "fas fa-spa",
    description: "Gentle yoga focusing on basic postures and breathing techniques.",
    level: "Easy"
  },
  {
    name: "airin yoga",
    icon: "fas fa-spa",
    description: "Unique aerial yoga combining traditional poses with silk hammocks.",
    level: "Medium"
  },
  {
    name: "strengh",
    icon: "fas fa-dumbbell",
    description: "Build muscle strength and endurance with targeted resistance training.",
    level: "Medium"
  },
  {
    name: "core",
    icon: "fas fa-dumbbell",
    description: "Strengthen your core muscles with focused abdominal and stability exercises.",
    level: "Medium"
  },
  {
    name: "booty shaping",
    icon: "fas fa-dumbbell",
    description: "Sculpt and tone your glutes with targeted lower body exercises.",
    level: "Medium"
  },
  {
    name: "cardio dance",
    icon: "fas fa-music",
    description: "Fun cardiovascular workout combining dance moves with high-energy music.",
    level: "Medium"
  },
  {
    name: "bachata",
    icon: "fas fa-music",
    description: "Learn sensual Latin dance moves while getting a great workout.",
    level: "Easy"
  },
  {
    name: "freestyle dance",
    icon: "fas fa-music",
    description: "Express yourself through creative dance movements and improve coordination.",
    level: "Medium"
  },
  {
    name: "circuit",
    icon: "fas fa-dumbbell",
    description: "High-intensity circuit training combining multiple exercise stations.",
    level: "Hard"
  },
  {
    name: "Trx",
    icon: "fas fa-dumbbell",
    description: "Suspension training using body weight for strength and stability.",
    level: "Medium"
  },
  {
    name: "bodypump",
    icon: "fas fa-dumbbell",
    description: "Barbell workout for lean muscles using light weights and high repetitions.",
    level: "Medium"
  },
  {
    name: "HIIT",
    icon: "fas fa-fire",
    description: "High-Intensity Interval Training for maximum calorie burn and fitness.",
    level: "Hard"
  },
  {
    name: "summit",
    icon: "fas fa-mountain",
    description: "Challenge yourself with peak-performance training sessions.",
    level: "Hard"
  },
  {
    name: "balance",
    icon: "fas fa-leaf",
    description: "Improve stability, coordination, and body awareness.",
    level: "Easy"
  },
  {
    name: "cardio u",
    icon: "fas fa-heart",
    description: "Cardiovascular training designed for all fitness levels.",
    level: "Medium"
  },
  {
    name: "Upper Body",
    icon: "fas fa-dumbbell",
    description: "Focus on strengthening arms, shoulders, chest, and back muscles.",
    level: "Medium"
  },
  {
    name: "Kettle Bell",
    icon: "fas fa-dumbbell",
    description: "Full-body workout using kettlebells for strength and conditioning.",
    level: "Hard"
  },
  {
    name: "Mix Fight",
    icon: "fas fa-fist-raised",
    description: "Combination of different martial arts techniques and combat sports.",
    level: "Hard"
  },
  {
    name: "Beast Mode",
    icon: "fas fa-fire",
    description: "Extreme high-intensity training for maximum results.",
    level: "Hard"
  },
  {
    name: "Lower Body",
    icon: "fas fa-dumbbell",
    description: "Target legs, glutes, and lower body muscles for strength and tone.",
    level: "Medium"
  }
];

async function seedClassTypes() {
  console.log("🌱 Seeding class types...");
  
  try {
    for (const classType of classTypes) {
      await prisma.classType.upsert({
        where: { name: classType.name },
        update: {
          icon: classType.icon,
          description: classType.description,
          level: classType.level,
        },
        create: classType,
      });
      console.log(`✅ Created/Updated class type: ${classType.name}`);
    }
    
    console.log(`🎉 Successfully seeded ${classTypes.length} class types!`);
  } catch (error) {
    console.error("❌ Error seeding class types:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedClassTypes().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { seedClassTypes };