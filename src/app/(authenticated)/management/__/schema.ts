import { z } from 'zod';


export const CreateSubscriptionInputSchema = z.object({
    memberId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    packageId: z.string(),
    paymentMethod: z.string(),
    tax: z.number(),
    totalPayment: z.number(),
});

export const SubscriptionSchema = z.object({
    id: z.string().optional(),
    memberId: z.string(),
    startDate: z.date(),
    endDate: z.date().nullable(),
    member: z.object({
        id: z.string(),
        user: z.object({
            name: z.string(),
            email: z.string(),
        }),
    }).optional(),
    payments: z.array(z.object({
        id: z.string().optional(),
        subscriptionId: z.string(),
        status: z.enum(['SUCCESS', 'PENDING', 'FAILED']),
        method: z.string(),
        totalPayment: z.number(),
        createdAt: z.date().optional(),
    })).optional(),
    package: z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        description: z.string().nullable(),
        sessions: z.number().nullable(),
        day: z.number().nullable(),
        reward: z.number().nullable(),
        isActive: z.boolean().nullable(),
        createdAt: z.date().nullable(),
        updatedAt: z.date().nullable(),
        type: z.enum(['GYM_MEMBERSHIP', 'PERSONAL_TRAINER']),
    }),
    paymentValidation: z.object({
        id: z.string().optional(),
        isOnlinePayment: z.boolean().optional(),
        orderReference: z.string().optional(),
        paymentStatus: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'ACCEPTED', 'DECLINED']).optional(),
        totalPayment: z.number().optional(),
        paymentMethod: z.string().optional(),
        createdAt: z.date().optional(),
    }).optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Create = z.infer<typeof CreateSubscriptionInputSchema>;