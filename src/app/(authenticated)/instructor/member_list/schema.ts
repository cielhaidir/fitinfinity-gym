import { z } from "zod";

export const memberSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    remainingSessions: z.number().min(0),
    subscriptionEndDate: z.string().datetime(),
});

export type Member = z.infer<typeof memberSchema>; 