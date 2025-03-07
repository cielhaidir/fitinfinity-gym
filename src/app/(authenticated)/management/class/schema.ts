import { z } from "zod"

export const classSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    limit: z.number().nullable(),
    trainerId: z.string(),
    schedule: z.date(),
    duration: z.number(),
    trainer: z.object({
        id: z.string(),
        userId: z.string(),
        description: z.string().nullable(),
        user: z.object({
            name: z.string().nullable(),
        })
    }).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export type Class = z.infer<typeof classSchema>

export const createClassSchema = z.object({
    name: z.string().min(1, "Name is required"),
    limit: z.number().nullable(),
    trainerId: z.string().min(1, "Trainer is required"),
    schedule: z.date(),
    duration: z.number().min(1, "Duration is required"),
})

export type CreateClassInput = z.infer<typeof createClassSchema> 