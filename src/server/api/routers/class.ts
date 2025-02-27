import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const classRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
            limit: z.number(),
            price: z.number(),
            id_employee: z.string(), // PT ID
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.class.create({
                data: {
                    name: input.name,
                    limit: input.limit,
                    price: input.price,
                    id_employee: input.id_employee,
                },
            });
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1),
            search: z.string().optional(),
            searchColumn: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const skip = (input.page - 1) * input.limit;
            const where = input.search && input.searchColumn ? {
                [input.searchColumn]: {
                    contains: input.search,
                    mode: "insensitive",
                }
            } : {};

            const [items, total] = await Promise.all([
                ctx.db.class.findMany({
                    skip,
                    take: input.limit,
                    where,
                    include: {
                        pt: {
                            include: {
                                user: true
                            }
                        }
                    },
                    orderBy: { name: 'asc' }
                }),
                ctx.db.class.count({ where })
            ]);

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    update: protectedProcedure
        .input(z.object({
            id_class: z.string(),
            name: z.string(),
            limit: z.number(),
            price: z.number(),
            id_employee: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.class.update({
                where: { id_class: input.id_class },
                data: {
                    name: input.name,
                    limit: input.limit,
                    price: input.price,
                    id_employee: input.id_employee,
                },
            });
        }),

    remove: protectedProcedure
        .input(z.object({
            id_class: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.class.delete({
                where: { id_class: input.id_class },
            });
        }),

    getTrainers: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.personalTrainer.findMany({
                where: { isActive: true },
                include: {
                    user: true
                }
            });
        }),
});
