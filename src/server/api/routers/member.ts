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
                        [input.searchColumn ?? "rfidNumber"]: {
                            contains: input.search,
                            mode: "insensitive" as const
                        }
                    }
                : {};

            const items = await ctx.db.membership.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { createdAt: "desc" },
                include: {
                    user: true,
                },
            });

            const total = await ctx.db.membership.count({ where: whereClause });

            return {
                items,
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
            registerDate: z.date().optional(),
            rfidNumber: z.string().optional(),
            isActive: z.boolean().optional(),
            revokedAt: z.date().optional(),
            user: z.object({
                name: z.string().min(1),
                email: z.string().email(),
                address: z.string().optional(),
                phone: z.string().optional(),
                birthDate: z.date().optional(),
                idNumber: z.string().optional(),
            }).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membership.update({
                where: { id: input.id },
                data: {
                    registerDate: input.registerDate,
                    rfidNumber: input.rfidNumber,
                    isActive: input.isActive,
                    revokedAt: input.revokedAt,
                    user: {
                        update: {
                            name: input.user?.name,
                            email: input.user?.email,
                            address: input.user?.address,
                            phone: input.user?.phone,
                            birthDate: input.user?.birthDate,
                            idNumber: input.user?.idNumber,
                        },
                    },
                },
            });
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membership.delete({
                where: { id: input.id },
            });
        }),

});
