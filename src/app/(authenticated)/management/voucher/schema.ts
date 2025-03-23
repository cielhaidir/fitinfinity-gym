import { z } from "zod"

export const voucherSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxClaim: z.number(),
  type: z.enum(["REFERRAL", "GENERAL"]),
  discountType: z.enum(["PERCENT", "CASH"]),
  referralCode: z.string().nullable(),
  amount: z.number(),
  isActive: z.boolean(),
  expiryDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Voucher = z.infer<typeof voucherSchema> 