import { z } from "zod"

export const rewardSchema = z.object({
  id: z.string(),
  name: z.string(),
  iconName: z.string(),
  price: z.number(),
  stock: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Reward = z.infer<typeof rewardSchema> 