import { z } from "zod"

export const personalTrainerSchema = z.object({
    id: z.string(),
    userId: z.string(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }),
    description: z.string().nullable(),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const UserPersonalTrainerSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    address: z.string(),
    phone: z.string(),
    birthDate: z.date(),
    idNumber: z.string(),
    description: z.string().optional(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }).optional(),
})

export type UserPersonalTrainer = z.infer<typeof UserPersonalTrainerSchema>
export type PersonalTrainer = z.infer<typeof personalTrainerSchema>

export const roleSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    permissions: z.array(z.object({
        permission: z.object({
            id: z.string(),
            name: z.string()
        })
    })).optional()
})

export type Role = z.infer<typeof roleSchema>

export const rolePermissionSchema = z.object({
    roleId: z.string(),
    permissionId: z.string(),
    role: z.object({
        id: z.string(),
        name: z.string(),
    }),
    permission: z.object({
        id: z.string(),
        name: z.string(),
    })
})

export type RolePermission = z.infer<typeof rolePermissionSchema>
