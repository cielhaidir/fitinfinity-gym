import { z } from "zod";

const CLASS_OPTIONS = [
  "yoga",
  "zumba",
  "strengh",
  "core",
  "booty shaping",
  "cardio dance",
  "bachata",
  "muaythai",
  "poundfit",
  "freestyle dance",
  "kpop dance",
  "circuit",
  "thaiboxig",
  "Trx",
  "Airin yoga",
  "Hatha yoga",
  "bodycombat",
  "mat pilates",
  "vinyasa yoga",
  "bootcamp",
  "bodypump",
  "HIIT",
  "summit",
  "balance",
  "cardio u",
] as const;

export const classSchema = z.object({
  id: z.string().optional(),
  name: z.enum(CLASS_OPTIONS),
  limit: z.number().nullable(),
  instructorName: z.string().min(1, "Instructor name is required"),
  schedule: z.date(),
  duration: z.number(),
  price: z.number(),
  // Removed trainer object
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Class = z.infer<typeof classSchema>;

export const createClassSchema = z.object({
  name: z.enum(CLASS_OPTIONS),
  limit: z.number().nullable(),
  instructorName: z.string().min(1, "Instructor name is required"),
  schedule: z.date(),
  duration: z.number().min(1, "Duration is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
});

export const createBulkClassSchema = z.object({
  name: z.enum(CLASS_OPTIONS),
  limit: z.number().nullable(),
  instructorName: z.string().min(1, "Instructor name is required"),
  schedules: z.array(z.date()).min(1, "At least one schedule is required"),
  duration: z.number().min(1, "Duration is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateBulkClassInput = z.infer<typeof createBulkClassSchema>;
