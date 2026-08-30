import { z } from "zod";

export const classSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Class name is required"),
  limit: z.number().nullable(),
  instructorName: z.string().min(1, "Instructor name is required"),
  instructorId: z.string().nullable().optional(),
  schedule: z.date(),
  duration: z.number(),
  price: z.number(),
  status: z.string().optional(),
  cancelReason: z.string().nullable().optional(),
  sessionCounted: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Class = z.infer<typeof classSchema>;

export const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  limit: z.number().nullable(),
  instructorName: z.string().min(1, "Instructor name is required"),
  instructorId: z.string().nullable().optional(),
  schedule: z.date(),
  duration: z.number().min(1, "Duration is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
});

export const createBulkClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  limit: z.number().nullable(),
  instructorName: z.string().min(1, "Instructor name is required"),
  instructorId: z.string().nullable().optional(),
  schedules: z.array(z.date()).min(1, "At least one schedule is required"),
  duration: z.number().min(1, "Duration is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateBulkClassInput = z.infer<typeof createBulkClassSchema>;
