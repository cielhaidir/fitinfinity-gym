import { z } from "zod";

export const memberSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  remainingSessions: z.number().min(0),
  subscriptionEndDate: z.string(),
  packageName: z.string().optional(),
  height: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  isFrozen: z.boolean().optional(),
  frozenAt: z.string().optional().nullable(),
  freezeDays: z.number().optional().nullable(),
  freezeMode: z.string().optional().nullable(),
});

export type Member = z.infer<typeof memberSchema>;
