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

export const UserSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable().transform(e => e === "" ? null : e),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    birthDate: z.date().nullable(),
    idNumber: z.string().nullable(),
})

export const UserMemberSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable().transform(e => e === "" ? null : e),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }).optional(),
    address: z.string(),
    phone: z.string(),
    birthDate: z.date(),
    idNumber: z.string(),
    rfidNumber: z.string().nullable(),
})

export type UserMember = z.infer<typeof UserMemberSchema>
export type User = z.infer<typeof UserSchema>
export type Member = z.infer<typeof memberSchema>
