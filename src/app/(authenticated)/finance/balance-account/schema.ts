import { z } from "zod";

export const balanceAccountSchema = z.object({
  id: z.number(),
  name: z.string(),
  account_number: z.string(),
});

export const balanceAccountListSchema = z.object({
  items: z.array(balanceAccountSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type BalanceAccount = z.infer<typeof balanceAccountSchema>;
export type BalanceAccountList = z.infer<typeof balanceAccountListSchema>;

// For API response
export const balanceAccountResponseSchema = z.array(balanceAccountSchema);
export type BalanceAccountResponse = z.infer<
  typeof balanceAccountResponseSchema
>;
