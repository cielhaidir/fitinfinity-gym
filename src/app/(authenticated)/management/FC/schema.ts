import { z } from "zod"

export const fcSchema = z.object({
    id: z.string(),
    userId: z.string(),
    referralCode: z.string().nullable(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const UserFCSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    address: z.string(),
    phone: z.string(),
    birthDate: z.date(),
    idNumber: z.string(),
    referralCode: z.string().min(5, "Referral code must be at least 5 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }).optional(),
})

export type UserFC = z.infer<typeof UserFCSchema>
export type FC = z.infer<typeof fcSchema> 