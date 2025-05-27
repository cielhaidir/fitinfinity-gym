import { z } from "zod";
import {
    createTRPCRouter,
    permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus } from "@prisma/client";

export const subscriptionRouter = createTRPCRouter({
    create: permissionProtectedProcedure(['create:subscription'])
        .input(z.object({
            memberId: z.string(),
            startDate: z.date(),
            packageId: z.string(),
            trainerId: z.string().nullable().optional(), // Fixed: Make it both optional and nullable
            duration: z.number(),
            subsType:  z.enum(["gym", "trainer"]),
            paymentMethod: z.string(),
            totalPayment: z.number(),
            status: z.enum(["SUCCESS", "PENDING", "FAILED"]).optional().default("SUCCESS"),
            orderReference: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const member = await ctx.db.membership.findUnique({
                where: { userId: input.memberId }
              });
              
              if (!member) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Member with ID ${input.memberId} does not exist.`,
                });
              }
            
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
                        trainerId: input.trainerId || null, // Ensure null is used if trainerId is undefined
                        remainingSessions: input.duration,
                        endDate: new Date(new Date(input.startDate).setDate(
                            new Date(input.startDate).getDate() + 30
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
                    status: input.status || "SUCCESS",
                    method: input.paymentMethod,
                    totalPayment: input.totalPayment,
                    orderReference: input.orderReference,
                }
            });

            if (input.status === "SUCCESS") {
                await ctx.db.membership.update({
                    where: { id: input.memberId },
                    data: { isActive: true },
                });
            }
            
            return subscription;
        }),

    updatePaymentStatus: permissionProtectedProcedure(['edit:subscription'])
        .input(z.object({
            orderReference: z.string(),
            status: z.enum(["SUCCESS", "PENDING", "FAILED", "CANCELED", "EXPIRED", "CHALLENGED", "REFUNDED", "SETTLED"]),
            gatewayResponse: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const payment = await ctx.db.payment.findFirst({
                where: { orderReference: input.orderReference },
                include: { subscription: true }
            });

            if (!payment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Payment not found"
                });
            }

            // Update payment with new status and gateway response if provided
            const updateData: any = { 
                status: input.status as PaymentStatus,
                updatedAt: new Date()
            };

            // If status is SUCCESS and wasn't before, set the paidAt timestamp
            if (input.status === "SUCCESS" && payment.status !== "SUCCESS") {
                updateData.paidAt = new Date();
                
                // If subscription is available, also update the subscription status here
                if (payment.subscription) {
                    // await ctx.db.subscription.update({
                    //     where: { id: payment.subscription.id },
                    //     data: { isActive: true }
                    // });

                    await ctx.db.membership.update({
                        where: { id: payment.subscription.memberId },
                        data: { isActive: false }
                    });
                }
            }

            // Store gateway response if provided
            if (input.gatewayResponse) {
                updateData.gatewayResponse = input.gatewayResponse;
            }

            const updatedPayment = await ctx.db.payment.update({
                where: { id: payment.id },
                data: updateData,
                include: { subscription: true }
            });

            // If payment is now successful, apply all relevant benefits
            if (input.status === "SUCCESS" && payment.subscription) {
                // First, activate the membership
                await ctx.db.membership.update({
                    where: { id: payment.subscription.memberId },
                    data: { isActive: true }
                });
                
                // Get package details for points
                const packageDetails = await ctx.db.package.findUnique({
                    where: { id: payment.subscription.packageId }
                });
                
                // Get membership to find user
                const membership = await ctx.db.membership.findUnique({
                    where: { id: payment.subscription.memberId },
                    include: { user: true }
                });
                
                // Award points if applicable
                if (packageDetails?.point && packageDetails.point > 0 && membership?.user) {
                    await ctx.db.user.update({
                        where: { id: membership.user.id },
                        data: {
                            point: { increment: packageDetails.point }
                        }
                    });
                }
            }

            return updatedPayment;
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
    const subscription = await ctx.db.subscription.findUnique({
      where: { id: input.id },
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
        trainer:{
            include: {
                user: {
                select: {
                    name: true,
                    email: true,
                }
                }
            }
        },
        package: true,
        payments: true,
      }
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return {
      subscription,
      payment: subscription.payments?.[0] ?? null
    };
  }),


    getByOrderReference: permissionProtectedProcedure(['show:subscription'])
        .input(z.object({ orderReference: z.string() }))
        .query(async ({ ctx, input }) => {
            const payment = await ctx.db.payment.findFirst({
                where: { orderReference: input.orderReference },
                include: {
                    subscription: {
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
                            trainer:{
                                include: {
                                    user: {
                                    select: {
                                        name: true,
                                        email: true,
                                    }
                                    }
                                }
                            },
                            package: true
                        }
                    }
                }
            });
            
            if (!payment || !payment.subscription) {
                throw new Error("Subscription not found");
            }
            
            return {
                payment,
                subscription: payment.subscription
            };
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
            paymentMethod: z.string().optional().default("CASH"),
            orderReference: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const member = await ctx.db.membership.findFirst({
                    where: { 
                        userId: ctx.session.user.id,
                        isActive: true 
                    },
                });

                if (!member) {
                    throw new Error("Active member not found. Please check your membership status.");
                }

                const packageData = await ctx.db.package.findUnique({
                    where: { 
                        id: input.packageId 
                    }
                });

                if (!packageData) {
                    throw new Error("Package not found");
                }

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

                const paymentStatus = input.paymentMethod === "CASH" ? "SUCCESS" : "PENDING";
                
                await ctx.db.payment.create({
                    data: {
                        subscriptionId: subscription.id,
                        status: paymentStatus,
                        method: input.paymentMethod,
                        totalPayment: packageData.price * input.duration,
                        orderReference: input.orderReference,
                    }
                });

                if (paymentStatus === "SUCCESS") {
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
                }

                return {
                    success: true,
                    subscription,
                    message: paymentStatus === "SUCCESS" 
                        ? `Checkout successful! You earned ${packageData.point * input.duration} points.`
                        : "Checkout initiated. Please complete the payment to activate your subscription."
                };
            } catch (error) {
                console.error("Checkout error:", error);
                throw error;
            }
        }),

    delete: permissionProtectedProcedure(['delete:subscription'])
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.$transaction(async (tx) => {
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

                if (subscription.payments && subscription.payments.length > 0) {
                    await tx.payment.deleteMany({
                        where: { subscriptionId: input.id }
                    });
                }

                const deletedSubscription = await tx.subscription.delete({
                    where: { id: input.id }
                });

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

