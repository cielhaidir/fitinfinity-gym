import { z } from "zod"

export const memberSchema = z.object({
    id: z.string(),
    userId: z.string(),
    user: z.object({
        name: z.string().nullable(),
    }),
    registerDate: z.date(),
    rfidNumber: z.string().nullable(),
    isActive: z.boolean().default(false),
    createdBy: z.string().nullable(),
    // creator: z.object({
    //     // Define the User schema here if needed
    // }).nullable(),
    revokedAt: z.date().nullable(),
    createdAt: z.date().default(new Date()),
    updatedAt: z.date().default(new Date()),
    // subscriptions: z.array(z.object({
    //     // Define the Subscription schema here if needed
    // }))
})

export type Member = z.infer<typeof memberSchema>
