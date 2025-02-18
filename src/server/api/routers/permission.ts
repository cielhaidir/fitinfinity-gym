import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const permissionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.create({
                data: {
                    name: input.name,
                },
            });
        }),

    edit: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                },
            });
        }),

    detail: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.permission.findUnique({
                where: { id: input.id },
            });
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            pageSize: z.number().min(1).max(100),
        }))
        .query(async ({ ctx, input }) => {
            const permissions = await ctx.db.permission.findMany({
                skip: (input.page - 1) * input.pageSize,
                take: input.pageSize,
                orderBy: { id: "desc" },
            });

            const total = await ctx.db.permission.count();

            return {
                permissions,
                total,
                page: input.page,
                pageSize: input.pageSize,
            };
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.permission.findUnique({
                where: { id: input.id },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                },
            });
        }),
});
