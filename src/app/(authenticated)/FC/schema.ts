import { z } from "zod";

export const fcMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    height: z.number().nullable(),
    weight: z.number().nullable(),
    birthDate: z.string().nullable(),
    registerDate: z.string(),
    isActive: z.boolean(),
    rfidNumber: z.string().nullable(),
});

export type FCMember = z.infer<typeof fcMemberSchema>; 