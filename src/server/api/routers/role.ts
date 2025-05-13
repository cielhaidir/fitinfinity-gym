import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const roleRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.role.create({
                data: {
                    name: input.name,
                }
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.role.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                }
            });
        }),

    listAll: protectedProcedure
        .input(z.object({
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const whereClause = input.search
                ? {
                    name: {
                        contains: input.search,
                        mode: "insensitive" as const
                    }
                }
                : {};

            const items = await ctx.db.role.findMany({
                where: whereClause,
                orderBy: { name: "asc" },
            });

            return items;
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const whereClause = input.search
                ? {
                    name: {
                        contains: input.search,
                        mode: "insensitive" as const
                    }
                }
                : {};

            const items = await ctx.db.role.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { name: "asc" },
            });

            const total = await ctx.db.role.count({ where: whereClause });

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
            return ctx.db.role.delete({
                where: { id: input.id },
            });
        }),

    getAll: protectedProcedure
        .query(async ({ ctx }) => {
            const roles = await ctx.db.role.findMany({
                orderBy: {
                    name: 'asc'
                }
            });
            return roles;
        }),
}); 