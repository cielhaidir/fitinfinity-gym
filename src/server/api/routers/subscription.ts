import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const subscriptionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            memberId: z.string(),
            startDate: z.date(),
            packageId: z.string(),
            trainerId: z.string().nullable(),
            duration: z.number(),
            subsType:  z.enum(["gym", "trainer"]),
            paymentMethod: z.string(), // Add payment method input
            totalPayment: z.number(), // Add total payment input
        }))
        .mutation(async ({ ctx, input }) => {
            const data = {
                memberId: input.memberId,
                packageId: input.packageId,
                startDate: input.startDate,
                ...(input.subsType === "gym"
                    ? {
                        endDate: new Date(new Date(input.startDate).setDate(
                            new Date(input.startDate).getDate() + input.duration
                        )),
                    }
                    : {
                        trainerId: input.trainerId,
                        remainingSessions: input.duration,
                    }),
            };

            const subscription = await ctx.db.subscription.create({
                data: data,
                include: {
                    member: {
                        select: {
                            id: true,
                            userId: true,
                            user: {
                                select: {
                                    name: true,
                                }
                            }
                        }
                    },
                    package: true,
                    payments: true,
                }
            });

            await ctx.db.payment.create({
                data: {
                    subscriptionId: subscription.id,
                    status: "SUCCESS",
                    method: input.paymentMethod,
                    totalPayment: input.totalPayment,
                }
            });

            await ctx.db.membership.update({
                where: { id: input.memberId },
                data: { isActive: true },
            });
            return subscription;
        }),

    edit: protectedProcedure
        .input(z.object({
            id: z.string(),
            memberId: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.subscription.update({
                where: { id: input.id },
                data: {
                    memberId: input.memberId,
                    startDate: input.startDate,
                    endDate: input.endDate,
                },
            });
        }),

    detail: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.subscription.findUnique({
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

            const whereClause: any = input.search
                ? input.searchColumn?.startsWith("user.")
                    ? {
                        member: {
                            user: {
                                [input.searchColumn.replace("user.", "")]: {
                                    contains: input.search,
                                    mode: "insensitive" as const
                                }
                            }
                        }
                    } : {
                        [input.searchColumn || "name"]: {
                            contains: input.search,
                            mode: "insensitive" as const
                        }
                    }
                : {};


            const items = await ctx.db.subscription.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { id: "desc" },
                include: {
                    member: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                }
                            }
                        }
                    },
                    package: true,
                    payments: true,
                }
            });

            const total = await ctx.db.subscription.count();

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    getByIdMember: protectedProcedure
        .input(z.object({
            memberId: z.string(),
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
        }))
        .query(async ({ ctx, input }) => {
            const items = await ctx.db.subscription.findMany({
                where: { memberId: input.memberId },
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                orderBy: { id: "desc" },
                include: {
                    member: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                }
                            }
                        }
                    },
                    package: true,
                    payments: true,
                }
            });

            const total = await ctx.db.subscription.count({
                where: { memberId: input.memberId },
            });

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
            return ctx.db.subscription.findUnique({
                where: { id: input.id },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            memberId: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.subscription.update({
                where: { id: input.id },
                data: {
                    memberId: input.memberId,
                    startDate: input.startDate,
                    endDate: input.endDate,
                },
            });
        }),
});
