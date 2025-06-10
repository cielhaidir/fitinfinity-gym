import { z } from "zod";

export const transactionSchema = z.object({
  id: z.number().optional(),
  bank_id: z.number(),
  account_id: z.number(),
  type: z.string(),
  file: z.string(),
  description: z.string(),
  transaction_date: z.date(),
  // transaction_number: z.string(),
  amount: z.number(),
  closed_at: z.date().nullable().optional(),
  bank: z
    .object({
      id: z.number(),
      name: z.string(),
      account_number: z.string(),
    })
    .optional(),
  account: z
    .object({
      id: z.number(),
      reff: z.string(),
      name: z.string(),
      type: z.string(),
      flow: z.enum(["income", "outcome", "both"]),
    })
    .optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;
