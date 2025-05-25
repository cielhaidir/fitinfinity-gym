import { z } from "zod";
import {
    createTRPCRouter,
    permissionProtectedProcedure,
} from "@/server/api/trpc";

export const subscriptionRouter = createTRPCRouter({
    create: permissionProtectedProcedure(['create:subscription'])
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
                        endDate: new Date(new Date(input.startDate).setDate(
                            new Date(input.startDate).getDate() + 30 // Default to 30 days for trainer packages
                        )),
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

    edit: permissionProtectedProcedure(['edit:subscription'])
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

    detail: permissionProtectedProcedure(['show:subscription'])
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.subscription.findUnique({
                where: { id: input.id },
            });
        }),

    list: permissionProtectedProcedure(['list:subscription'])
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
                                    email: true,
                                }
                            }
                        }
                    },
                    package: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            type: true,
                            point: true,
                        }
                    },
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

    getByIdMember: permissionProtectedProcedure(['list:subscription'])
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
                                    email: true,
                                }
                            }
                        }
                    },
                    package: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            type: true,
                            point: true,
                        }
                    },
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

    getById: permissionProtectedProcedure(['show:subscription'])
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.subscription.findUnique({
                where: { id: input.id },
            });
        }),

    update: permissionProtectedProcedure(['edit:subscription'])
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

    checkout: permissionProtectedProcedure(['create:subscription'])
        .input(z.object({
            packageId: z.string(),
            duration: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                // Get the member first based on logged in user
                const member = await ctx.db.membership.findFirst({
                    where: { 
                        userId: ctx.session.user.id,
                        isActive: true 
                    },
                });

                if (!member) {
                    throw new Error("Active member not found. Please check your membership status.");
                }

                // Get the package
                const packageData = await ctx.db.package.findUnique({
                    where: { 
                        id: input.packageId 
                    }
                });

                if (!packageData) {
                    throw new Error("Package not found");
                }

                // Create subscription with proper end date calculation
                const subscription = await ctx.db.subscription.create({
                    data: {
                        memberId: member.id,
                        packageId: packageData.id,
                        startDate: new Date(),
                        ...(packageData.type === 'GYM_MEMBERSHIP' 
                            ? {
                                endDate: new Date(new Date().setDate(
                                    new Date().getDate() + input.duration
                                )),
                            }
                            : {
                                remainingSessions: input.duration,
                            }),
                    },
                });

                // Create payment
                await ctx.db.payment.create({
                    data: {
                        subscriptionId: subscription.id,
                        status: "SUCCESS",
                        method: "CASH",
                        totalPayment: packageData.price * input.duration,
                    }
                });

                // Update user's points based on package points
                await ctx.db.user.update({
                    where: { 
                        id: ctx.session.user.id 
                    },
                    data: {
                        point: {
                            increment: packageData.point * input.duration,
                        },
                    },
                });

                return {
                    success: true,
                    subscription,
                    message: `Checkout successful! You earned ${packageData.point * input.duration} points.`
                };
            } catch (error) {
                console.error("Checkout error:", error);
                throw error;
            }
        }),

    delete: permissionProtectedProcedure(['delete:subscription'])
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Use a transaction to ensure all related data is deleted properly
            return ctx.db.$transaction(async (tx) => {
                // Get the subscription first to check if it exists
                const subscription = await tx.subscription.findUnique({
                    where: { id: input.id },
                    include: {
                        member: true,
                        payments: true
                    }
                });

                if (!subscription) {
                    throw new Error("Subscription not found");
                }

                // First delete all payments associated with the subscription
                if (subscription.payments && subscription.payments.length > 0) {
                    await tx.payment.deleteMany({
                        where: { subscriptionId: input.id }
                    });
                }

                // Then delete the subscription
                const deletedSubscription = await tx.subscription.delete({
                    where: { id: input.id }
                });

                // Update member's active status if this was their only active subscription
                const remainingSubscriptions = await tx.subscription.count({
                    where: { 
                        memberId: subscription.memberId,
                        endDate: {
                            gt: new Date()
                        }
                    }
                });

                if (remainingSubscriptions === 0) {
                    await tx.membership.update({
                        where: { id: subscription.memberId },
                        data: { isActive: false }
                    });
                }

                return deletedSubscription;
            });
        }),
});

