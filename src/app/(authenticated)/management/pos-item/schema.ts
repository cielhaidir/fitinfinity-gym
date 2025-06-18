import { z } from "zod";

export const posItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  cost: z.number().min(0, "Cost must be non-negative").optional(),
  stock: z.number().int().min(0, "Stock must be non-negative").default(0),
  minStock: z.number().int().min(0, "Minimum stock must be non-negative").optional(),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
});

export type POSItem = z.infer<typeof posItemSchema>;