import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const personalTrainerRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            userId: z.string(),
            isActive: z.boolean().optional(),
            createdBy: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.create({
                data: {
                    userId: input.userId,
                    isActive: input.isActive ?? true,
                },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            user: z.object({
                name: z.string().min(1),
                email: z.string().email(),
                address: z.string().optional(),
                phone: z.string().optional(),
                birthDate: z.date().optional(),
                idNumber: z.string().optional(),
            }),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.update({
                where: { id: input.id },
                data: {
                    user: {
                        update: input.user,
                    },
                },
            });
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
            search: z.string().optional(),
            searchColumn: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const whereClause = input.search
                ? input.searchColumn?.startsWith("user.")
                    ? {
                        user: {
                            [input.searchColumn.replace("user.", "")]: {
                                contains: input.search,
                                mode: "insensitive" as const
                            }
                        }
                    }
                    : {
                        [input.searchColumn ?? ""]: {
                            contains: input.search,
                            mode: "insensitive" as const
                        }
                    }
                : {};

            const items = await ctx.db.personalTrainer.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { createdAt: "desc" },
                include: {
                    user: true,
                },
            });

            const total = await ctx.db.personalTrainer.count({ where: whereClause });

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.delete({
                where: { id: input.id },
            });
        }),

    listAll: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.personalTrainer.findMany({
                include: {
                    user: true,
                },
            });
        }),
}); 