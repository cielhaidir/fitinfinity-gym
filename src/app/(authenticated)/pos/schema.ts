import { z } from "zod";

export const posSaleItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().int().min(1),
  subtotal: z.number(),
});

export const posSaleSchema = z.object({
  items: z.array(posSaleItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  amountPaid: z.number().min(0),
  paymentMethod: z.string().min(1, "Payment method is required"),
  balanceId: z.number().optional(),
  notes: z.string().optional(),
});

export type POSSaleItem = z.infer<typeof posSaleItemSchema>;
export type POSSale = z.infer<typeof posSaleSchema>;