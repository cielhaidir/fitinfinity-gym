import { z } from "zod"

const CLASS_OPTIONS = [
    "yoga",
    "zumba",
    "strengh",
    "core",
    "booty shaping",
    "cardio dance",
    "bachata",
    "muaythai",
    "poundfit",
    "freestyle dance",
    "kpop dance",
    "circuit",
    "thaiboxig",
    "Trx",
    "Airin yoga",
    "Hatha yoga",
    "bodycombat",
    "mat pilates",
    "vinyasa yoga",
    "bootcamp",
    "bodypump",
    "HIIT",
    "summit",
    "balance",
    "cardio u"
] as const;

export const classSchema = z.object({
    id: z.string().optional(),
    name: z.enum(CLASS_OPTIONS),
    limit: z.number().nullable(),
    trainerId: z.string(),
    schedule: z.date(),
    duration: z.number(),
    price: z.number(),
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
    name: z.enum(CLASS_OPTIONS),
    limit: z.number().nullable(),
    trainerId: z.string().min(1, "Trainer is required"),
    schedule: z.date(),
    duration: z.number().min(1, "Duration is required"),
    price: z.number().min(0, "Price must be greater than or equal to 0"),
})

export type CreateClassInput = z.infer<typeof createClassSchema> 