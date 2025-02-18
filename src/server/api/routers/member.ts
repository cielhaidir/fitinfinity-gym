import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";

export const memberRouter = createTRPCRouter({


    create: protectedProcedure
        .input(z.object({
            userId: z.string(),
            registerDate: z.date(),
            rfidNumber: z.string().optional(),
            isActive: z.boolean().optional(),
            createdBy: z.string().optional(),
            revokedAt: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membership.create({
                data: {
                    userId: input.userId,
                    registerDate: input.registerDate,
                    rfidNumber: input.rfidNumber,
                    isActive: input.isActive ?? true,
                    createdBy: input.createdBy ?? ctx.session.user.id,
                    revokedAt: input.revokedAt,
                },
            });
        }),

    edit: protectedProcedure
        .input(z.object({
            id: z.string(),
            userId: z.string().optional(),
            registerDate: z.date().optional(),
            rfidNumber: z.string().optional(),
            isActive: z.boolean().optional(),
            createdBy: z.string().optional(),
            revokedAt: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membership.update({
                where: { id: input.id },
                data: {
                    userId: input.userId,
                    registerDate: input.registerDate,
                    rfidNumber: input.rfidNumber,
                    isActive: input.isActive,
                    createdBy: input.createdBy,
                    revokedAt: input.revokedAt,
                },
            });
        }),

    detail: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.membership.findUnique({
                where: { id: input.id },
            });
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
        }))
        .query(async ({ ctx, input }) => {
            const memberships = await ctx.db.membership.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
            console.log(memberships);

            const total = await ctx.db.membership.count();

            return {
                memberships,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.membership.findUnique({
                where: { id: input.id },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            userId: z.string().optional(),
            registerDate: z.date().optional(),
            rfidNumber: z.string().optional(),
            isActive: z.boolean().optional(),
            createdBy: z.string().optional(),
            revokedAt: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membership.update({
                where: { id: input.id },
                data: {
                    userId: input.userId,
                    registerDate: input.registerDate,
                    rfidNumber: input.rfidNumber,
                    isActive: input.isActive,
                    createdBy: input.createdBy,
                    revokedAt: input.revokedAt,
                },
            });
        }),

});
