import { z } from "zod";

export const posCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type POSCategory = z.infer<typeof posCategorySchema>;