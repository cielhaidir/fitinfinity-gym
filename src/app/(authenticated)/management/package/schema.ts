import { z } from "zod";

export const PackageTypeEnum = z.enum(['GYM_MEMBERSHIP', 'PERSONAL_TRAINER']);

export const PackageSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    description: z.string().nullable(),
    price: z.number().min(0, "Price must be greater than or equal to 0"),
    type: PackageTypeEnum,
    sessions: z.number().nullable(),
    day: z.number().nullable(),
    isActive: z.boolean().default(true).optional(),
    reward: z.number().nullable(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type Package = z.infer<typeof PackageSchema>;
