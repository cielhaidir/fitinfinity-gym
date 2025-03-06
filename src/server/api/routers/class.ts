import { z } from "zod"
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc"
import { createClassSchema } from "@/app/(authenticated)/management/class/schema"

export const classRouter = createTRPCRouter({
    create: protectedProcedure
        .input(createClassSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const newClass = await ctx.db.class.create({
                    data: {
                        name: input.name,
                        limit: input.limit,
                        trainerId: input.trainerId,
                    },
                    include: {
                        trainer: {
                            include: {
                                user: true,
                            },
                        },
                    },
                })
                return newClass
            } catch (error) {
                throw new Error("Failed to create class")
            }
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1),
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const { page, limit, search } = input
            const skip = (page - 1) * limit

            try {
                const where = search ? {
                    name: { contains: search, mode: "insensitive" as const },
                } : undefined

                const [items, total] = await Promise.all([
                    ctx.db.class.findMany({
                        skip,
                        take: limit,
                        where,
                        include: {
                            trainer: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                    }),
                    ctx.db.class.count({ where }),
                ])

                return {
                    items,
                    total,
                    page,
                    limit,
                }
            } catch (error) {
                throw new Error("Failed to fetch classes")
            }
        }),

    update: protectedProcedure
        .input(createClassSchema.extend({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input
            try {
                const updatedClass = await ctx.db.class.update({
                    where: { id },
                    data,
                    include: {
                        trainer: {
                            include: {
                                user: true,
                            },
                        },
                    },
                })
                return updatedClass
            } catch (error) {
                throw new Error("Failed to update class")
            }
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                const deletedClass = await ctx.db.class.delete({
                    where: { id: input.id },
                    include: {
                        trainer: {
                            include: {
                                user: true,
                            },
                        },
                    },
                })
                return deletedClass
            } catch (error) {
                throw new Error("Failed to delete class")
            }
        }),
}) 