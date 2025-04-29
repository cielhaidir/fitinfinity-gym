import { z } from "zod";

// Schema for member reward creation
export const createMemberRewardSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  rewardId: z.string().min(1, "Reward ID is required"),
});

// Schema for reward data
export const rewardSchema = z.object({
  id: z.string(),
  name: z.string(),
  iconName: z.string(),
  price: z.number(),
  stock: z.number(),
});

// Schema for member data
export const memberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  point: z.number(),
});

// Schema for member reward data
export const memberRewardSchema = z.object({
  id: z.string(),
  member: memberSchema,
  reward: rewardSchema,
  claimedAt: z.date(),
});

// Types
export type CreateMemberRewardInput = z.infer<typeof createMemberRewardSchema>;
export type Reward = z.infer<typeof rewardSchema>;
export type Member = z.infer<typeof memberSchema>;
export type MemberReward = z.infer<typeof memberRewardSchema>; 