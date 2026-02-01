import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus, EmailType } from "@prisma/client";
import { emailService } from "@/lib/email/emailService"; // Add this import
import { format } from "date-fns"; // Add this import
import { siteConfig } from "@/lib/config/siteConfig"; // Add this import
import { subscriptionsCreatedTotal } from "@/server/metrics"; // Add metrics import
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

// Fungsi untuk mengupdate subscription yang sudah expired
async function updateExpiredSubscriptions(ctx: any) {
  const now = new Date();
  await ctx.db.subscription.updateMany({
    where: {
      isActive: true,
      endDate: { lt: now },
    },
    data: {
      isActive: false,
    },
  });
}

export const subscriptionRouter = createTRPCRouter({
  // Get combined sales list (PersonalTrainer + FC)
  getSalesList: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      const [personalTrainers, fcs] = await Promise.all([
        ctx.db.personalTrainer.findMany({
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.fC.findMany({
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      // Combine and format the data
      const salesList = [
        ...personalTrainers.map((pt) => ({
          id: pt.id,
          name: pt.user?.name || "Unknown",
          email: pt.user?.email || "",
          type: "PersonalTrainer" as const,
          typeName: "Personal Trainer",
        })),
        ...fcs.map((fc) => ({
          id: fc.id,
          name: fc.user?.name || "Unknown",
          email: fc.user?.email || "",
          type: "FC" as const,
          typeName: "Fitness Consultant",
        })),
      ];

      return salesList.sort((a, b) => a.name.localeCompare(b.name));
    }),

  create: permissionProtectedProcedure(["create:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        startDate: z.date(),
        packageId: z.string(),
        trainerId: z.string().nullable().optional(), // Fixed: Make it both optional and nullable
        salesId: z.string().optional(), // ID of the sales person
        salesType: z.enum(["PersonalTrainer", "FC"]).optional(), // Type of sales person
        duration: z.number(),
        subsType: z.enum(["gym", "trainer", "group"]),
        paymentMethod: z.string(),
        totalPayment: z.number(),
        status: z
          .enum(["SUCCESS", "PENDING", "FAILED"])
          .optional()
          .default("SUCCESS"),
        orderReference: z.string().optional(),
        freezeAtStart: z.boolean().optional(),
        freezeDays: z.number().min(0).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const member = await ctx.db.membership.findUnique({
          where: { userId: input.memberId },
        });

        if (!member) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Member with ID ${input.memberId} does not exist.`,
          });
        }

        // Validate package exists
        const packageDetails = await ctx.db.package.findUnique({
          where: { id: input.packageId },
        });

        if (!packageDetails) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Package with ID ${input.packageId} not found.`,
          });
        }

        // Validate trainer if provided
        if (input.trainerId) {
          const trainer = await ctx.db.personalTrainer.findUnique({
            where: { id: input.trainerId },
          });

          if (!trainer) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Trainer with ID ${input.trainerId} not found.`,
            });
          }
        }

        const data = {
          memberId: member.id,
          packageId: input.packageId,
          startDate: input.startDate,
          salesId: input.salesId || null,
          salesType: input.salesType || null,
          ...(input.subsType === "gym"
            ? {
                endDate: new Date(
                  new Date(input.startDate).setDate(
                    new Date(input.startDate).getDate() + input.duration + (input.freezeDays || 0),
                  ),
                ),
                freezeAtStart: input.freezeAtStart || false,
                freezeDays: input.freezeDays || null,
                isFrozen: input.freezeAtStart || false,
                frozenAt: input.freezeAtStart ? input.startDate : null,
              }
            : {
                trainerId: input.trainerId || null, // Ensure null is used if trainerId is undefined
                remainingSessions: input.duration,
                endDate: new Date(
                  new Date(input.startDate).setDate(
                    new Date(input.startDate).getDate() + 30,
                  ),
                ),
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
                  },
                },
              },
            },
            package: true,
            payments: true,
          },
        });

        // Increment subscription creation metrics
        subscriptionsCreatedTotal.labels({
          package_type: packageDetails?.type || 'unknown',
          user_type: 'member',
        }).inc();

        await ctx.db.payment.create({
          data: {
            subscriptionId: subscription.id,
            status: input.status || "SUCCESS",
            method: input.paymentMethod,
            totalPayment: input.totalPayment,
            orderReference: input.orderReference,
          },
        });

        if (input.status === "SUCCESS") {
          await ctx.db.membership.update({
            where: { id: member.id },
            data: { isActive: true },
          });

          // If it's a group training package, create GroupSubscription and GroupMember
          if (input.subsType === "group") {
            if (packageDetails?.isGroupPackage) {
              // Check if group subscription already exists for this subscription
              const existingGroupMember = await ctx.db.groupMember.findFirst({
                where: { subscriptionId: subscription.id }
              });

              if (!existingGroupMember) {
                // Create group subscription
                const groupSubscription = await ctx.db.groupSubscription.create({
                  data: {
                    groupName: `${subscription.member?.user?.name || 'Member'}'s Group`,
                    leadSubscriptionId: subscription.id,
                    packageId: input.packageId,
                    totalMembers: 1,
                    maxMembers: packageDetails.maxUsers ?? 4,
                    status: "ACTIVE"
                  }
                });

                // Add lead as first member
                await ctx.db.groupMember.create({
                  data: {
                    groupSubscriptionId: groupSubscription.id,
                    subscriptionId: subscription.id,
                    status: "ACTIVE"
                  }
                });
              }
            }
          }
        }

        result = subscription;
        success = true;
        return subscription;
      } catch (err) {
        error = err as Error;
        success = false;
        // Log detailed error for debugging
        console.error("Subscription creation error:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          input: {
            memberId: input.memberId,
            packageId: input.packageId,
            trainerId: input.trainerId,
            subsType: input.subsType,
            orderReference: input.orderReference,
          }
        });

        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Handle Prisma errors
        if (error && typeof error === 'object' && 'code' in error) {
          const prismaError = error as { code: string; meta?: any };
          
          if (prismaError.code === 'P2002') {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A subscription with this information already exists.",
            });
          }
          
          if (prismaError.code === 'P2003') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid reference: One or more IDs do not exist.",
            });
          }
        }

        // Generic error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create subscription. Please try again.",
        });
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.create",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  updatePaymentStatus: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        orderReference: z.string(),
        status: z.enum([
          "SUCCESS",
          "PENDING",
          "FAILED",
          "CANCELED",
          "EXPIRED",
          "CHALLENGED",
          "REFUNDED",
          "SETTLED",
        ]),
        gatewayResponse: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const payment = await ctx.db.payment.findFirst({
        where: { orderReference: input.orderReference },
        include: { subscription: true },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Update payment with new status and gateway response if provided
      const updateData: any = {
        status: input.status as PaymentStatus,
        updatedAt: new Date(),
      };

      // If status is SUCCESS and wasn't before, set the paidAt timestamp
      if (input.status === "SUCCESS" && payment.status !== "SUCCESS") {
        updateData.paidAt = new Date();

        // If subscription is available, also update the subscription status here
        if (payment.subscription) {
          await ctx.db.membership.update({
            where: { id: payment.subscription.memberId },
            data: { isActive: true },
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
        include: {
          subscription: {
            include: {
              member: {
                include: {
                  user: true,
                },
              },
              trainer: {
                include: {
                  user: true,
                },
              },
              package: true,
            },
          },
        },
      });

      // If payment is now successful, apply all relevant benefits
      if (input.status === "SUCCESS" && payment.subscription) {
        // First, activate the membership
        await ctx.db.membership.update({
          where: { id: payment.subscription.memberId },
          data: { isActive: true },
        });

        // Get package details for points
        const packageDetails = await ctx.db.package.findUnique({
          where: { id: payment.subscription.packageId },
        });

        // Get membership to find user
        const membership = await ctx.db.membership.findUnique({
          where: { id: payment.subscription.memberId },
          include: { user: true },
        });

        // Award points if applicable
        if (
          packageDetails?.point &&
          packageDetails.point > 0 &&
          membership?.user
        ) {
          await ctx.db.user.update({
            where: { id: membership.user.id },
            data: {
              point: { increment: packageDetails.point },
            },
          });
        }

        // // Send email notifications if this is a new successful payment
        // if (updatedPayment.subscription.member?.user?.email) {
        //   // Send payment receipt email
        //   const paymentTemplate = await ctx.db.emailTemplate.findFirst({
        //     where: { type: EmailType.PAYMENT_RECEIPT },
        //   });

        //   if (paymentTemplate) {
        //     await emailService.sendTemplateEmail({
        //       to: updatedPayment.subscription.member.user.email,
        //       templateId: paymentTemplate.id,
        //       templateData: {
        //         memberName: updatedPayment.subscription.member.user.name,
        //         packageName: updatedPayment.subscription.package.name,
        //         receiptNumber:
        //           updatedPayment.orderReference || updatedPayment.id,
        //         totalAmount: updatedPayment.totalPayment,
        //         paymentStatus: PaymentStatus.SUCCESS,
        //         statusClass: PaymentStatus.SUCCESS.toLowerCase(),
        //         paymentDate: format(new Date(), "PPP"),
        //         paymentMethod: updatedPayment.method,
        //         duration: updatedPayment.subscription.remainingSessions
        //           ? `${updatedPayment.subscription.remainingSessions} sessions`
        //           : `${
        //               updatedPayment.subscription.endDate
        //                 ? Math.ceil(
        //                     (updatedPayment.subscription.endDate.getTime() -
        //                       updatedPayment.subscription.startDate.getTime()) /
        //                       (1000 * 60 * 60 * 24),
        //                   )
        //                 : 0
        //             } days`,
        //         currency: "Rp",
        //         memberEmail: updatedPayment.subscription.member.user.email,
        //         supportEmail: siteConfig.supportEmail,
        //         supportPhone: siteConfig.supportPhone,
        //         logoUrl: siteConfig.logoUrl,
        //         portalUrl: siteConfig.portalUrl,
        //         currentYear: new Date().getFullYear(),
        //         address: siteConfig.address,
        //         // Conditional trainer data
        //         ...(updatedPayment.subscription.trainer && {
        //           personalTrainer: true,
        //           trainerName: updatedPayment.subscription.trainer.user.name,
        //         }),
        //       },
        //     });
        //   }

        //   // Send membership confirmation email
        //   const membershipTemplate = await ctx.db.emailTemplate.findFirst({
        //     where: { type: EmailType.MEMBERSHIP_CONFIRMATION },
        //   });

        //   if (membershipTemplate) {
        //     await emailService.sendTemplateEmail({
        //       to: updatedPayment.subscription.member.user.email,
        //       templateId: membershipTemplate.id,
        //       templateData: {
        //         memberName: updatedPayment.subscription.member.user.name,
        //         membershipId: updatedPayment.subscription.member.id,
        //         packageName: updatedPayment.subscription.package.name,
        //         startDate: format(updatedPayment.subscription.startDate, "PPP"),
        //         endDate: updatedPayment.subscription.endDate
        //           ? format(updatedPayment.subscription.endDate, "PPP")
        //           : "N/A",
        //         personalTrainer: updatedPayment.subscription.trainer
        //           ? true
        //           : false,
        //         trainerName: updatedPayment.subscription.trainer?.user.name,
        //         memberEmail: updatedPayment.subscription.member.user.email,
        //         portalUrl: siteConfig.portalUrl,
        //         supportEmail: siteConfig.supportEmail,
        //         supportPhone: siteConfig.supportPhone,
        //         logoUrl: siteConfig.logoUrl,
        //         currentYear: new Date().getFullYear(),
        //         address: siteConfig.address,
        //         currency: "Rp",
        //         paymentMethod: updatedPayment.method,
        //         totalAmount: updatedPayment.totalPayment,
        //         receiptNumber:
        //           updatedPayment.orderReference || updatedPayment.id,
        //         paymentStatus: PaymentStatus.SUCCESS,
        //         statusClass: PaymentStatus.SUCCESS.toLowerCase(),
        //         paymentDate: format(new Date(), "PPP"),
        //       },
        //     });
        //   }
        // }
      }

        result = updatedPayment;
        success = true;
        return updatedPayment;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.updatePaymentStatus",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  detail: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.subscription.findUnique({
        where: { id: input.id },
      });
    }),

      listActive: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
        salesId: z.string().optional(),
        trainerId: z.string().optional(),
        status: z.enum(["all", "active", "inactive"]).optional().default("all"),
        dateFilterType: z.enum(["payment", "startDate", "endDate"]).optional().default("payment"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions sebelum query
      await updateExpiredSubscriptions(ctx);

     const whereClause: any = {
  // Exclude soft deleted subscriptions
  deletedAt: null,
  // Filter by status if not "all"
  ...(input.status !== "all" && {
    isActive: input.status === "active",
  }),
  OR: [
    { groupMembers: { none: {} } }, // bukan member group
    { leadGroupSubscriptions: { some: {} } }, // leader group
  ],
  // Filter by salesId if provided
  ...(input.salesId && {
    salesId: input.salesId,
  }),
  // Filter by trainerId if provided
  ...(input.trainerId && {
    trainerId: input.trainerId,
  }),
  // Filter by date range based on selected date field type
  ...((input.startDate || input.endDate) && (() => {
    const dateFilterType = input.dateFilterType || "payment";
    
    if (dateFilterType === "payment") {
      // Filter by payment creation date (current behavior)
      return {
        payments: {
          some: {
            ...(input.startDate && {
              createdAt: { gte: input.startDate },
            }),
            ...(input.endDate && {
              createdAt: { lte: input.endDate },
            }),
          },
        },
      };
    } else if (dateFilterType === "startDate") {
      // Filter by subscription start date
      return {
        ...(input.startDate && {
          startDate: { gte: input.startDate },
        }),
        ...(input.endDate && {
          startDate: { lte: input.endDate },
        }),
      };
    } else if (dateFilterType === "endDate") {
      // Filter by subscription end date
      return {
        ...(input.startDate && {
          endDate: { gte: input.startDate },
        }),
        ...(input.endDate && {
          endDate: { lte: input.endDate },
        }),
      };
    }
    return {};
  })()),
  ...(input.search
    ? input.searchColumn === "member.user.name"
      ? {
          member: {
            user: {
              name: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          },
        }
      : input.searchColumn === "package.name"
      ? {
          package: {
            name: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
        }
      : {
          [input.searchColumn || "name"]: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        }
    : {}),
};


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
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
              updatedAt: true,
            },
          },
        },
      });

      const total = await ctx.db.subscription.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  list: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions sebelum query
      await updateExpiredSubscriptions(ctx);

      const whereClause: any = {
        // Exclude soft deleted subscriptions
        deletedAt: null,
        ...(input.search
          ? input.searchColumn === "member.user.name"
            ? {
                member: {
                user: {
                  name: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            }
          : input.searchColumn === "package.name"
          ? {
              package: {
                name: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            }
            : {
                [input.searchColumn || "name"]: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              }
          : {}),
      };

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
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          payments: {
            where: { deletedAt: null }, // Exclude soft deleted payments
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
              updatedAt: true,
            },
          },
        },
      });

      const total = await ctx.db.subscription.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getByIdMember: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions sebelum query
      // await updateExpiredSubscriptions(ctx);

      const items = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
        },
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
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          payments: {
            where: { deletedAt: null }, // Exclude soft deleted payments
          },
        },
      });

      const total = await ctx.db.subscription.count({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
        },
      });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Get subscription history for a specific member (for member profile view)
  getSubscriptionHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions before query
      await updateExpiredSubscriptions(ctx);

      const items = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
          payments: {
            some: {
              status: "SUCCESS",
              deletedAt: null, // Exclude soft deleted payments
            }
          }
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { id: "desc" },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          payments: {
            where: {
              status: "SUCCESS",
              deletedAt: null, // Exclude soft deleted payments
            },
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1, // Get only the latest successful payment
          },
          trainer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Get sales information for each subscription
      const subscriptionsWithSales = await Promise.all(
        items.map(async (subscription) => {
          let salesPerson = null;
          
          if (subscription.salesId && subscription.salesType) {
            if (subscription.salesType === "PersonalTrainer") {
              const pt = await ctx.db.personalTrainer.findUnique({
                where: { id: subscription.salesId },
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              });
              if (pt) {
                salesPerson = {
                  id: pt.id,
                  name: pt.user?.name || "Unknown PT",
                  email: pt.user?.email || "",
                  type: "PersonalTrainer" as const,
                };
              }
            } else if (subscription.salesType === "FC") {
              const fc = await ctx.db.fC.findUnique({
                where: { id: subscription.salesId },
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              });
              if (fc) {
                salesPerson = {
                  id: fc.id,
                  name: fc.user?.name || "Unknown FC",
                  email: fc.user?.email || "",
                  type: "FC" as const,
                };
              }
            }
          }

          return {
            ...subscription,
            salesPerson,
          };
        })
      );

      const total = await ctx.db.subscription.count({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
          payments: {
            some: {
              status: "SUCCESS",
              deletedAt: null, // Exclude soft deleted payments
            }
          }
        },
      });

      return {
        items: subscriptionsWithSales,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getById: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions sebelum query
      // await updateExpiredSubscriptions(ctx);

      const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.id },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: true,
          payments: {
            orderBy: { createdAt: 'desc' }, // ambil yang terbaru
          },
        },
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return {
        subscription,
        payment: subscription.payments?.[0] ?? null,
      };
    }),

  getByOrderReference: permissionProtectedProcedure(["show:subscription"])
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
                    },
                  },
                },
              },
              trainer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              package: true,
            },
          },
        },
      });

      if (!payment || !payment.subscription) {
        throw new Error("Subscription not found");
      }

      return {
        payment,
        subscription: payment.subscription,
      };
    }),

  update: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        id: z.string(),
        memberId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const shouldBeActive = input.endDate
          ? input.endDate > new Date()
          : undefined;

        result = await ctx.db.subscription.update({
          where: { id: input.id },
          data: {
            memberId: input.memberId,
            startDate: input.startDate,
            endDate: input.endDate,
            ...(shouldBeActive !== undefined && { isActive: shouldBeActive }),
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.update",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  checkout: permissionProtectedProcedure(["create:subscription"])
    .input(
      z.object({
        packageId: z.string(),
        duration: z.number(),
        paymentMethod: z.string().optional().default("CASH"),
        orderReference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const member = await ctx.db.membership.findFirst({
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
        });

        if (!member) {
          throw new Error(
            "Active member not found. Please check your membership status.",
          );
        }

        const packageData = await ctx.db.package.findUnique({
          where: {
            id: input.packageId,
          },
        });

        if (!packageData) {
          throw new Error("Package not found");
        }

        const subscription = await ctx.db.subscription.create({
          data: {
            memberId: member.id,
            packageId: packageData.id,
            startDate: new Date(),
            ...(packageData.type === "GYM_MEMBERSHIP"
              ? {
                  endDate: new Date(
                    new Date().setDate(new Date().getDate() + input.duration),
                  ),
                }
              : {
                  remainingSessions: input.duration,
                }),
          },
        });

        // Increment subscription creation metrics for checkout
        subscriptionsCreatedTotal.labels({
          package_type: packageData.type || 'unknown',
          user_type: 'self_checkout',
        }).inc();

        const paymentStatus =
          input.paymentMethod === "CASH" ? "SUCCESS" : "PENDING";

        await ctx.db.payment.create({
          data: {
            subscriptionId: subscription.id,
            status: paymentStatus,
            method: input.paymentMethod,
            totalPayment: packageData.price * input.duration,
            orderReference: input.orderReference,
          },
        });

        if (paymentStatus === "SUCCESS") {
          await ctx.db.user.update({
            where: {
              id: ctx.session.user.id,
            },
            data: {
              point: {
                increment: packageData.point * input.duration,
              },
            },
          });
        }

        result = {
          success: true,
          subscription,
          message:
            paymentStatus === "SUCCESS"
              ? `Checkout successful! You earned ${packageData.point * input.duration} points.`
              : "Checkout initiated. Please complete the payment to activate your subscription.",
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Checkout error:", err);
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.checkout",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  delete: permissionProtectedProcedure(["delete:subscription"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        const subscription = await tx.subscription.findUnique({
          where: { id: input.id },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            payments: {
              where: {
                status: "SUCCESS",
                deletedAt: null,
              },
            },
            package: true,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Subscription with id ${input.id} not found`,
          });
        }

        // Check if already soft deleted
        if (subscription.deletedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Subscription has already been deleted",
          });
        }

        const now = new Date();

        // Decrement user points if the package awarded points and there was a successful payment
        if (
          subscription.package?.point &&
          subscription.package.point > 0 &&
          subscription.member?.user?.id &&
          subscription.payments.length > 0
        ) {
          // Get current user points to ensure we don't go below 0
          const user = await tx.user.findUnique({
            where: { id: subscription.member.user.id },
            select: { point: true },
          });

          if (user) {
            // Calculate how many points to deduct (don't go below 0)
            const pointsToDeduct = Math.min(
              subscription.package.point,
              user.point
            );

            await tx.user.update({
              where: { id: subscription.member.user.id },
              data: {
                point: { decrement: pointsToDeduct },
              },
            });
          }
        }

        // Soft delete all related payments
        await tx.payment.updateMany({
          where: { subscriptionId: input.id },
          data: { deletedAt: now },
        });

        // Soft delete the subscription
        const deletedSubscription = await tx.subscription.update({
          where: { id: input.id },
          data: {
            deletedAt: now,
            isActive: false,
          },
        });

        // Check if member has any remaining active subscriptions (not soft deleted)
        const remainingSubscriptions = await tx.subscription.count({
          where: {
            memberId: subscription.memberId,
            isActive: true,
            deletedAt: null,
          },
        });

        // If no active subscriptions remain, deactivate the membership
        if (remainingSubscriptions === 0) {
          await tx.membership.update({
            where: { id: subscription.memberId },
            data: { isActive: false },
          });
        }

          return deletedSubscription;
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.delete",
          method: "DELETE",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Tambahkan procedure untuk menonaktifkan subscription yang sudah expired
  deactivateExpired: permissionProtectedProcedure(["update:subscription"])
    .mutation(async ({ ctx }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const now = new Date();
        const updateResult = await ctx.db.subscription.updateMany({
          where: {
            isActive: true,
            endDate: { lt: now },
          },
          data: {
            isActive: false,
          },
        });
        result = { count: updateResult.count };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.deactivateExpired",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: {},
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Freeze all active subscriptions for a member
  freeze: permissionProtectedProcedure(["update:subscription"])
    .input(z.object({
      memberId: z.string(),
      freezePriceId: z.string().optional(),
      freezeDays: z.number().min(0).max(365).optional(),
      balanceAccountId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Find member
        const member = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Handle freeze pricing
      let freezePrice = null;
      let actualFreezeDays = input.freezeDays || 0;
      let freezePaymentAmount = 0;

      if (input.freezePriceId) {
        // Look up the freeze price
        freezePrice = await ctx.db.freezePrice.findUnique({
          where: { id: input.freezePriceId },
        });

        if (!freezePrice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Freeze price not found",
          });
        }

        if (!freezePrice.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected freeze price is not active",
          });
        }

        actualFreezeDays = freezePrice.freezeDays;
        freezePaymentAmount = freezePrice.price;
      } else if (input.freezeDays) {
        // Legacy: freezeDays provided directly (free freeze)
        actualFreezeDays = input.freezeDays;
      } else {
        // No freeze days specified, treat as UNTIL_UNFREEZE mode
        actualFreezeDays = 0;
      }

      const now = new Date();

      // Find all active, non-frozen subscriptions for this member that haven't expired
      // Validation guards (as per improvement plan):
      // ❌ Cannot freeze if already frozen (filtered by isFrozen: false)
      // ❌ Cannot freeze expired subscriptions (filtered by endDate > now)
      // ❌ Cannot freeze subscriptions without endDate
      const activeSubscriptions = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          isActive: true,
          isFrozen: false,
          deletedAt: null,
          endDate: { gt: now }, // Only subscriptions that haven't expired
        },
        include: { package: true },
      });

      // Explicit validation: check if no active subscriptions found
      if (activeSubscriptions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscriptions found to freeze. Subscriptions may already be frozen, expired, or not exist.",
        });
      }

      // Additional validation: check if any subscription is missing endDate
      const subscriptionsWithoutEndDate = activeSubscriptions.filter(sub => !sub.endDate);
      if (subscriptionsWithoutEndDate.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot freeze ${subscriptionsWithoutEndDate.length} subscription(s) without end date. Only gym memberships with end dates can be frozen.`,
        });
      }

      // Validate freezeDays is reasonable if provided
      if (actualFreezeDays === 0) {
        // Log warning but allow (treated as UNTIL_UNFREEZE)
        console.warn(`Freeze requested with freezeDays=0 for member ${input.memberId}, treating as UNTIL_UNFREEZE mode`);
      }

      // Validate balanceAccountId if there's a freeze fee
      if (freezePaymentAmount > 0) {
        if (!input.balanceAccountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Balance account is required when freeze fee is applied",
          });
        }

        // Verify balance account exists
        const balanceAccount = await ctx.db.balanceAccount.findUnique({
          where: { id: input.balanceAccountId },
        });

        if (!balanceAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Balance account not found",
          });
        }
      }

      // Create ONE transaction freeze record for the member (if there's a payment)
      let transactionFreezeId = null;
      if (freezePaymentAmount > 0 && freezePrice && input.balanceAccountId) {
        const transactionFreeze = await ctx.db.transactionFreeze.create({
          data: {
            balanceAccountId: input.balanceAccountId,
            amount: freezePaymentAmount,
            description: `Freeze fee for ${actualFreezeDays} days - ${activeSubscriptions.length} subscription(s)`,
            createdBy: ctx.session.user.id,
          },
        });
        transactionFreezeId = transactionFreeze.id;

        // Create freeze operation record for EACH subscription but link to the SAME TransactionFreeze
        for (const subscription of activeSubscriptions) {
          await ctx.db.freezeOperation.create({
            data: {
              subscriptionId: subscription.id,
              memberId: input.memberId,
              operationType: "FREEZE",
              freezePriceId: freezePrice.id,
              transactionFreezeId: transactionFreeze.id,
              freezeDays: actualFreezeDays,
              price: freezePaymentAmount, // Same price for all (member pays once)
              performedById: ctx.session.user.id,
            },
          });
        }
      } else {
        // Create freeze operation record without payment (free freeze) for each subscription
        // For custom freezes without a freezePriceId, create or find a FreezePrice entry
        let customFreezePriceId = input.freezePriceId;
        
        if (!customFreezePriceId && actualFreezeDays > 0) {
          // Try to find an existing FreezePrice for this duration (prefer free one)
          let customFreezePrice = await ctx.db.freezePrice.findFirst({
            where: {
              freezeDays: actualFreezeDays,
            },
          });

          // If no FreezePrice exists with these days, try to create one (might fail if not unique)
          if (!customFreezePrice) {
            try {
              customFreezePrice = await ctx.db.freezePrice.create({
                data: {
                  freezeDays: actualFreezeDays,
                  price: 0,
                  isActive: true,
                },
              });
            } catch (error) {
              // If creation fails (e.g., unique constraint), try to find again
              customFreezePrice = await ctx.db.freezePrice.findFirst({
                where: {
                  freezeDays: actualFreezeDays,
                },
              });
            }
          }

          customFreezePriceId = customFreezePrice?.id;
        }

        if (!customFreezePriceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Freeze price ID is required",
          });
        }

        for (const subscription of activeSubscriptions) {
          await ctx.db.freezeOperation.create({
            data: {
              subscriptionId: subscription.id,
              memberId: input.memberId,
              operationType: "FREEZE",
              freezePriceId: customFreezePriceId,
              transactionFreezeId: null,
              freezeDays: actualFreezeDays,
              price: 0,
              performedById: ctx.session.user.id,
            },
          });
        }
      }

      // Freeze each subscription individually using transaction
      const results = await ctx.db.$transaction(
        activeSubscriptions.map((subscription) => {
          if (!subscription.endDate) {
            // Skip subscriptions without endDate (shouldn't happen given the query filter)
            return ctx.db.subscription.update({
              where: { id: subscription.id },
              data: {}, // No-op
            });
          }

          // Calculate remaining days from now until endDate
          // misalkan endate 30 januari, sekarang 8 januari, berarti remainingDays = 22
          const remainingMillis = subscription.endDate.getTime() - now.getTime();
          const remainingDays = Math.max(0, Math.floor(remainingMillis / (1000 * 60 * 60 * 24)));

          // Determine freeze mode
          const freezeMode = (actualFreezeDays && actualFreezeDays > 0)
            ? "FIXED_DAYS"
            : "UNTIL_UNFREEZE";


          return ctx.db.subscription.update({
            where: { id: subscription.id },
            data: {
              isFrozen: true,
              // isActive: false, // Subscription becomes inactive while frozen
              frozenAt: now,
              freezeDays: actualFreezeDays > 0 ? actualFreezeDays : null,
              freezeMode: freezeMode,
              remainingDays: remainingDays,
              // Do NOT modify endDate
            },
          });
        })
      );

        result = {
          message: `Successfully frozen ${results.length} subscription(s)${freezePaymentAmount > 0 ? ` with ${actualFreezeDays} days freeze fee of ${freezePaymentAmount}` : ""}`,
          count: results.length,
          memberId: input.memberId,
          memberName: member.user?.name || "Unknown",
          freezePaymentAmount,
          transactionFreezeId,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.freeze",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Unfreeze all frozen subscriptions for a member
  unfreeze: permissionProtectedProcedure(["update:subscription"])
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Find member
        const member = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Find all frozen subscriptions for this member
      // Validation guards (as per improvement plan):
      // ❌ Cannot unfreeze if not frozen (filtered by isFrozen: true)
      const frozenSubscriptions = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          isFrozen: true,
          deletedAt: null,
        },
        include: { package: true },
      });

      // Explicit validation: check if no frozen subscriptions found
      if (frozenSubscriptions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No frozen subscriptions found to unfreeze. All subscriptions may already be active or not exist.",
        });
      }

      // Additional validation: check data integrity
      const subscriptionsWithoutFrozenAt = frozenSubscriptions.filter(sub => !sub.frozenAt);
      if (subscriptionsWithoutFrozenAt.length > 0) {
        console.error(`Data integrity issue: ${subscriptionsWithoutFrozenAt.length} frozen subscription(s) missing frozenAt timestamp for member ${input.memberId}`);
        // Don't throw error, let the transaction skip them with the existing logic
      }

      const now = new Date();
      let unfrozenCount = 0;

      // Get or create a FreezePrice entry for unfreeze operations (0 days, 0 price)
      let unfreezePrice = await ctx.db.freezePrice.findFirst({
        where: {
          freezeDays: 0,
          price: 0,
        },
      });

      if (!unfreezePrice) {
        unfreezePrice = await ctx.db.freezePrice.create({
          data: {
            freezeDays: 0,
            price: 0,
            isActive: true,
          },
        });
      }

      // Create a common performedAt timestamp for all unfreeze operations in this batch
      // This ensures they group together in the freeze history
      const batchPerformedAt = new Date();

      // Create unfreeze operation record for each subscription
      for (const subscription of frozenSubscriptions) {
        await ctx.db.freezeOperation.create({
          data: {
            subscriptionId: subscription.id,
            memberId: input.memberId,
            operationType: "UNFREEZE",
            freezePriceId: unfreezePrice.id,
            price: 0,
            transactionFreezeId: null,
            freezeDays: 0,
            performedById: ctx.session.user.id,
            performedAt: batchPerformedAt, // Use the same timestamp for all operations
          },
        });
      }

      // Unfreeze each subscription individually using transaction
      const results = await ctx.db.$transaction(
        frozenSubscriptions.map((subscription) => {
          if (!subscription.frozenAt) {
            // Skip subscriptions without frozenAt (data integrity issue)
            return ctx.db.subscription.update({
              where: { id: subscription.id },
              data: {}, // No-op
            });
          }

          // Calculate how long subscription has been frozen
          // misalkan frozenAt 1 januari, sekarang 8 januari, berarti frozenDaysSoFar = 7
          const frozenMillis = now.getTime() - subscription.frozenAt.getTime();
          const frozenDaysSoFar = Math.ceil(frozenMillis / (1000 * 60 * 60 * 24));

          // Infer freezeMode for backward compatibility (legacy data)
          const freezeMode = subscription.freezeMode ||
            (subscription.freezeDays && subscription.freezeDays > 0 ? "FIXED_DAYS" : "UNTIL_UNFREEZE");

          let extraDays: number;
          const remainingDays = subscription.remainingDays ?? 0;

          if (freezeMode === "FIXED_DAYS") {
            const freezeDays = subscription.freezeDays || 0;

            extraDays = remainingDays;
          } else {
 
            if (subscription.remainingDays !== null) {
              extraDays = subscription.remainingDays;
            } else if (subscription.endDate && subscription.frozenAt) {
              // Fallback for legacy data without remainingDays
              const legacyRemainingMillis = subscription.endDate.getTime() - subscription.frozenAt.getTime();
              extraDays = Math.max(0, Math.ceil(legacyRemainingMillis / (1000 * 60 * 60 * 24)));
            } else {
              extraDays = 0;
            }
          }

          // Calculate new end date
          const newEndDate = new Date(now);
          newEndDate.setDate(newEndDate.getDate() + extraDays);
          // Set to end of day for consistency
          newEndDate.setHours(23, 59, 59, 999);

          unfrozenCount++;

          return ctx.db.subscription.update({
            where: { id: subscription.id },
            data: {
              isFrozen: false,
              isActive: true, // Reactivate the subscription
              frozenAt: null,
              freezeDays: null,
              freezeMode: null,
              remainingDays: null,
              endDate: newEndDate,
            },
          });
        })
      );

        result = {
          message: `Successfully unfrozen ${unfrozenCount} subscription(s)`,
          count: unfrozenCount,
          memberId: input.memberId,
          memberName: member.user?.name || "Unknown",
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.unfreeze",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Update sales information for a subscription
  updateSales: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        salesId: z.string().nullable(),
        salesType: z.enum(["PersonalTrainer", "FC"]).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        console.log("Updating sales information for subscription:", input.subscriptionId);
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Validate that salesId and salesType match
      if (input.salesId && input.salesType) {
        if (input.salesType === "PersonalTrainer") {
          const trainer = await ctx.db.personalTrainer.findUnique({
            where: { id: input.salesId },
          });
          if (!trainer) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Personal trainer not found",
            });
          }
        } else if (input.salesType === "FC") {
          const fc = await ctx.db.fC.findUnique({
            where: { id: input.salesId },
          });
          if (!fc) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Fitness consultant not found",
            });
          }
        }
      }

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          salesId: input.salesId,
          salesType: input.salesType,
        },
        include: {
          member: { include: { user: true } },
          package: true,
          // sales: { include: { user: true } },
          // fc: { include: { user: true } },
        },
      });

        result = updatedSubscription;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.updateSales",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Transfer subscription to another user
  transfer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        newUserId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Verify the subscription exists and is active
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          package: true,
          payments: {
            where: { status: "SUCCESS" },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      if (!subscription.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only active subscriptions can be transferred",
        });
      }

      // Verify the new user exists
      const newUser = await ctx.db.user.findUnique({
        where: { id: input.newUserId },
      });

      if (!newUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user not found",
        });
      }

      // // Check if target user already has a membership
      const existingMembership = await ctx.db.membership.findFirst({
        where: { userId: input.newUserId },
      });

      // if (existingMembership) {
      //   throw new TRPCError({
      //     code: "CONFLICT",
      //     message: "Target user already has a membership",
      //   });
      // }

      // Get transfer price from config
      const transferPriceConfig = await ctx.db.config.findUnique({
        where: { key: "transfer_price" },
      });
      const transferPrice = transferPriceConfig ? parseFloat(transferPriceConfig.value) : 0;

        result = await ctx.db.$transaction(async (tx) => {
        // Create new membership for the target user

          let membershipId: string;

          if (!existingMembership) {
            const newMembership = await tx.membership.create({
              data: {
                userId: input.newUserId,
                registerDate: new Date(),
                isActive: true,
                createdBy: ctx.session.user.id,
              },
            });
            membershipId = newMembership.id;
          } else {
            membershipId = existingMembership.id;
          }

        // Create transfer history record
        await tx.subscriptionTransferHistory.create({
          data: {
            subscriptionId: input.subscriptionId,
            transferredPoint: subscription.package.point,
            fromMemberId: subscription.memberId,
            fromMemberName: subscription.member.user?.name || "Unknown",
            amount: transferPrice,
            reason: input.reason || null,
            file: null,
          },
        });

        // Update the subscription to point to the new membership
        const updatedSubscription = await tx.subscription.update({
          where: { id: input.subscriptionId },
          data: { memberId: membershipId },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            package: true,
          },
        });

        // Transfer points: Remove from old user, add to new user
        if (subscription.package.point > 0) {
          // Remove points from old user
          await tx.user.update({
            where: { id: subscription.member.userId },
            data: {
              point: { decrement: subscription.package.point },
            },
          });

          // Add points to new user
          await tx.user.update({
            where: { id: input.newUserId },
            data: {
              point: { increment: subscription.package.point },
            },
          });
        }
        
          return updatedSubscription;
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.transfer",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Upgrade gym membership to a new package
  upgradeGymSimple: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        newPackageId: z.string(),
        newEndDate: z.date(),
        paymentProofPath: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        // Verify the subscription exists and is eligible for upgrade
        const subscription = await tx.subscription.findUnique({
          where: { id: input.subscriptionId },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            package: true,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subscription not found",
          });
        }

        if (!subscription.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only active subscriptions can be upgraded",
          });
        }

        if (subscription.isFrozen) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot upgrade frozen subscription",
          });
        }

        if (subscription.package.type !== "GYM_MEMBERSHIP") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only gym memberships can be upgraded with this function",
          });
        }

        // Verify the new package exists and is a gym membership
        const newPackage = await tx.package.findUnique({
          where: { id: input.newPackageId },
        });

        if (!newPackage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "New package not found",
          });
        }

        if (newPackage.type !== "GYM_MEMBERSHIP") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New package must be a gym membership",
          });
        }

        if (!newPackage.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New package is not active",
          });
        }

        if (newPackage.id === subscription.packageId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot upgrade to the same package",
          });
        }

        // Validate new end date
        if (input.newEndDate <= subscription.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New end date must be after subscription start date",
          });
        }

        if (subscription.endDate && input.newEndDate <= subscription.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New end date must be after current subscription end date",
          });
        }

        // Create upgrade record
        await tx.upgradePackage.create({
          data: {
            subscriptionId: subscription.id,
            oldPackageId: subscription.packageId,
            newPackageId: input.newPackageId,
            paymentProofPath: input.paymentProofPath,
            createdBy: ctx.session.user.id,
          },
        });

        // Update the subscription with new package and end date
        const updatedSubscription = await tx.subscription.update({
          where: { id: input.subscriptionId },
          data: {
            packageId: input.newPackageId,
            endDate: input.newEndDate,
          },
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                type: true,
                point: true,
              },
            },
          },
        });

          return updatedSubscription;
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.upgradeGymSimple",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Get gym packages for upgrade dropdown
  getGymPackages: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      return ctx.db.package.findMany({
        where: {
          type: "GYM_MEMBERSHIP",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          point: true,
          day: true,
          description: true,
        },
        orderBy: {
          price: "asc",
        },
      });
    }),

  // List all subscriptions for export (no pagination)
  listAllForExport: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        salesId: z.string().optional(),
        trainerId: z.string().optional(),
        status: z.enum(["all", "active", "inactive"]).optional().default("all"),
        dateFilterType: z.enum(["payment", "startDate", "endDate"]).optional().default("payment"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions before query
      await updateExpiredSubscriptions(ctx);

      const whereClause: any = {
        // Exclude soft deleted subscriptions
        deletedAt: null,
        // Filter by status if not "all"
        ...(input.status !== "all" && {
          isActive: input.status === "active",
        }),
        OR: [
          { groupMembers: { none: {} } }, // not a group member
          { leadGroupSubscriptions: { some: {} } }, // group leader
        ],
        // Filter by salesId if provided
        ...(input.salesId && {
          salesId: input.salesId,
        }),
        // Filter by trainerId if provided
        ...(input.trainerId && {
          trainerId: input.trainerId,
        }),
        // Filter by date range based on selected date field type
        ...((input.startDate || input.endDate) && (() => {
          const dateFilterType = input.dateFilterType || "payment";
          
          if (dateFilterType === "payment") {
            // Filter by payment creation date (current behavior)
            return {
              payments: {
                some: {
                  ...(input.startDate && {
                    createdAt: { gte: input.startDate },
                  }),
                  ...(input.endDate && {
                    createdAt: { lte: input.endDate },
                  }),
                },
              },
            };
          } else if (dateFilterType === "startDate") {
            // Filter by subscription start date
            return {
              ...(input.startDate && {
                startDate: { gte: input.startDate },
              }),
              ...(input.endDate && {
                startDate: { lte: input.endDate },
              }),
            };
          } else if (dateFilterType === "endDate") {
            // Filter by subscription end date
            return {
              ...(input.startDate && {
                endDate: { gte: input.startDate },
              }),
              ...(input.endDate && {
                endDate: { lte: input.endDate },
              }),
            };
          }
          return {};
        })()),
      };

      const items = await ctx.db.subscription.findMany({
        where: whereClause,
        orderBy: { id: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return items;
    }),

  // Update remaining sessions for a subscription
  updateRemainingSessions: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        remainingSessions: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Verify the subscription exists
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          package: true,
          member: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Check if the package is a personal trainer package
      if (subscription.package.type !== "PERSONAL_TRAINER" && subscription.package.type !== "GROUP_TRAINING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only personal trainer packages have remaining sessions",
        });
      }

      // Update the subscription with the new remaining sessions
      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          remainingSessions: input.remainingSessions,
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

        result = updatedSubscription;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.updateRemainingSessions",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Update personal trainer for a subscription
  updateTrainer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        trainerId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Verify the subscription exists
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          package: true,
          member: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Check if the package is a personal trainer package
      if (subscription.package.type !== "PERSONAL_TRAINER" && subscription.package.type !== "GROUP_TRAINING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only personal trainer packages can have their trainer updated",
        });
      }

      // Validate that the trainer exists if trainerId is provided
      if (input.trainerId) {
        const trainer = await ctx.db.personalTrainer.findUnique({
          where: { id: input.trainerId },
          include: {
            user: true,
          },
        });

        if (!trainer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Personal trainer not found",
          });
        }

        if (!trainer.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Personal trainer is not active",
          });
        }
      }

      // Update the subscription with the new trainer
      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          trainerId: input.trainerId,
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

        result = updatedSubscription;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.updateTrainer",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Count subscriptions with optional filter
  count: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        where: z.any().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.subscription.count({
        where: input.where,
      });
    }),

  // Get freeze statistics with date filtering
  getFreezeStats: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      const dateFilter = start && end
        ? {
            performedAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

      // Get all freeze operations within the date range
      const freezeOperations = await ctx.db.freezeOperation.findMany({
        where: {
          operationType: "FREEZE",
          ...dateFilter,
        },
        include: {
          freezePrice: true,
          transactionFreeze: true,
        },
      });

      // Calculate total freeze count and revenue
      const freezeCount = freezeOperations.length;
      const totalRevenue = freezeOperations.reduce((sum, op) => {
        return sum + (op.price || 0);
      }, 0);

      return {
        freezeCount,
        totalRevenue,
      };
    }),

  // Get admin dashboard statistics with date filtering
  getAdminDashboardStats: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Apply GMT+8 timezone adjustments to dates
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      // Build date filter for payments (consistent with salesReport.ts)
      const paymentDateFilter = start && end
        ? {
            createdAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

      // 1. Active Memberships Count: subscriptions with endDate AFTER filter's end date (excluding frozen)
      const activeMembershipsCount = await ctx.db.subscription.count({
        where: {
          deletedAt: null,
          isActive: true,
          isFrozen: false,
          ...(end && {
            endDate: {
              gt: end,
            },
          }),
        },
      });

      // 2. Get all subscriptions with payments within date range for further analysis
      const subscriptionsInRange = await ctx.db.subscription.findMany({
        where: {
          deletedAt: null,
          payments: {
            some: {
              status: "SUCCESS",
              deletedAt: null,
              ...paymentDateFilter,
            },
          },
        },
        distinct: ['id'], // Ensure we only get unique subscriptions
        include: {
          member: {
            select: {
              id: true,
              userId: true,
            },
          },
          package: {
            select: {
              type: true,
              price: true,
            },
          },
          payments: {
            where: {
              status: "SUCCESS",
              deletedAt: null,
              ...paymentDateFilter,
            },
            select: {
              totalPayment: true,
              createdAt: true,
            },
          },
        },
      });

      // 3. Count Total New Members and Total Renewals
      // Logic: For each subscription in range, check if it's the member's first purchase or a renewal
      let totalNewMembers = 0;
      let totalRenewals = 0;
      
      for (const sub of subscriptionsInRange) {
        const memberId = sub.member.id;
        
        if (sub.package.type !== "GYM_MEMBERSHIP") {
    continue;
  }
  
        // Get all subscriptions for this member before the current one (by startDate)
        const previousSubscriptionsCount = await ctx.db.subscription.count({
          where: {
            memberId: memberId,
            deletedAt: null,
            package:{
              type: "GYM_MEMBERSHIP",
            },
            startDate: {
              lt: sub.startDate, // All subscriptions that started before this one
            },
          },
        });
        
        if (previousSubscriptionsCount === 0) {
          // This is the member's first subscription (new member)
          totalNewMembers++;
        } else {
          // This member has purchased before (renewal)
          totalRenewals++;
        }
      }

      // 5. Subscription Type Breakdown
      const subscriptionTypeBreakdown = {
        MEMBERSHIP: { count: 0, revenue: 0 },
        PERSONAL_TRAINER: { count: 0, revenue: 0 },
        GROUP_TRAINER: { count: 0, revenue: 0 },
      };

      for (const sub of subscriptionsInRange) {
        const packageType = sub.package.type;
        const revenue = sub.payments.reduce((sum, payment) => sum + payment.totalPayment, 0);

        if (packageType === "GYM_MEMBERSHIP") {
          subscriptionTypeBreakdown.MEMBERSHIP.count++;
          subscriptionTypeBreakdown.MEMBERSHIP.revenue += revenue;
        } else if (packageType === "PERSONAL_TRAINER") {
          subscriptionTypeBreakdown.PERSONAL_TRAINER.count++;
          subscriptionTypeBreakdown.PERSONAL_TRAINER.revenue += revenue;
        } else if (packageType === "GROUP_TRAINING") {
          subscriptionTypeBreakdown.GROUP_TRAINER.count++;
          subscriptionTypeBreakdown.GROUP_TRAINER.revenue += revenue;
        }
      }

      return {
        activeMembershipsCount,
        totalRenewals,
        totalNewMembers,
        subscriptionTypeBreakdown,
      };
    }),

  // Get transfer history for a specific subscription
  getTransferHistory: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const transferHistory = await ctx.db.subscriptionTransferHistory.findMany({
        where: {
          subscriptionId: input.subscriptionId,
        },
        include: {
          fromMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return transferHistory;
    }),

  // List all transfer history with pagination and filters (for admin page)
  listAllTransferHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        memberId: z.string().optional(),
        memberSearch: z.string().optional(),
        showCancelled: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        ...(input.memberId && {
          fromMemberId: input.memberId,
        }),
        ...(input.startDate && {
          createdAt: {
            gte: input.startDate,
          },
        }),
        ...(input.endDate && {
          createdAt: {
            ...((input.startDate && { gte: input.startDate }) || {}),
            lte: input.endDate,
          },
        }),
        // Filter by cancelled status
        ...(!input.showCancelled && {
          isCancelled: false,
        }),
        // Search by member name or email
        ...(input.memberSearch && {
          OR: [
            {
              fromMemberName: {
                contains: input.memberSearch,
                mode: "insensitive" as const,
              },
            },
            {
              fromMember: {
                user: {
                  email: {
                    contains: input.memberSearch,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              subscription: {
                member: {
                  user: {
                    OR: [
                      {
                        name: {
                          contains: input.memberSearch,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        email: {
                          contains: input.memberSearch,
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        }),
      };

      const items = await ctx.db.subscriptionTransferHistory.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        include: {
          subscription: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  price: true,
                },
              },
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          fromMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const total = await ctx.db.subscriptionTransferHistory.count({
        where: whereClause,
      });

      // Add fromMemberEmail to each item for easier access
      const itemsWithEmail = items.map(item => ({
        ...item,
        fromMemberEmail: item.fromMember?.user?.email || "",
      }));

      return {
        items: itemsWithEmail,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Cancel a subscription transfer
  cancelTransfer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        transferHistoryId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        // Find the transfer history record
        const transferHistory = await tx.subscriptionTransferHistory.findUnique({
          where: { id: input.transferHistoryId },
          include: {
            subscription: {
              include: {
                package: true,
                member: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            fromMember: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!transferHistory) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transfer history record not found",
          });
        }

        // Check if already cancelled
        if (transferHistory.isCancelled) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This transfer has already been cancelled",
          });
        }

        // Transfer the subscription BACK to the original member (fromMemberId)
        await tx.subscription.update({
          where: { id: transferHistory.subscriptionId },
          data: {
            memberId: transferHistory.fromMemberId,
          },
        });

        // Transfer points back: Remove from current owner, add back to original owner
        if (transferHistory.transferredPoint > 0) {
          // Remove points from current member (who received the transfer)
          const currentMemberUserId = transferHistory.subscription.member.userId;
          await tx.user.update({
            where: { id: currentMemberUserId },
            data: {
              point: { decrement: transferHistory.transferredPoint },
            },
          });

          // Add points back to original member (who transferred away)
          const originalMemberUserId = transferHistory.fromMember.userId;
          await tx.user.update({
            where: { id: originalMemberUserId },
            data: {
              point: { increment: transferHistory.transferredPoint },
            },
          });
        }

        // Mark the transfer history as cancelled
        const updatedTransferHistory = await tx.subscriptionTransferHistory.update({
          where: { id: input.transferHistoryId },
          data: {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledBy: ctx.session.user.id,
            cancelReason: input.reason || null,
          },
          include: {
            subscription: {
              include: {
                package: true,
                member: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            fromMember: {
              include: {
                user: true,
              },
            },
          },
        });

          return {
            success: true,
            message: "Transfer cancelled successfully. Subscription returned to original member.",
            transferHistory: updatedTransferHistory,
          };
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.cancelTransfer",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // List all freeze operations grouped by member (for admin freeze history page)
  listFreezeHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        operationType: z.enum(["all", "FREEZE", "UNFREEZE"]).optional().default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause for freeze operations
      const whereClause: any = {
        ...(input.operationType !== "all" && {
          operationType: input.operationType,
        }),
      };

      // Apply date filter on performedAt
      if (input.startDate || input.endDate) {
        whereClause.performedAt = {};
        if (input.startDate) {
          whereClause.performedAt.gte = input.startDate;
        }
        if (input.endDate) {
          whereClause.performedAt.lte = input.endDate;
        }
      }

      // Get all freeze operations with member info
      const allOperations = await ctx.db.freezeOperation.findMany({
        where: whereClause,
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          subscription: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          transactionFreeze: true,
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          performedAt: "desc",
        },
      });

      // Group operations by member and transactionFreezeId (or by member + performedAt for free freezes)
      const groupedMap = new Map<string, any>();

      for (const operation of allOperations) {
        // Create a unique key for grouping:
        // - If there's a transactionFreeze, group by memberId + transactionFreezeId (paid freezes)
        // - Otherwise, group by memberId + operationType + performedAt (rounded to second) for free freezes/unfreezes
        let groupKey: string;
        if (operation.transactionFreezeId) {
          groupKey = `${operation.memberId}_${operation.transactionFreezeId}`;
        } else {
          // Round performedAt to the second to group operations that happened at nearly the same time
          const roundedTime = new Date(operation.performedAt);
          roundedTime.setMilliseconds(0);
          groupKey = `${operation.memberId}_${operation.operationType}_${roundedTime.toISOString()}`;
        }

        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            id: groupKey,
            memberId: operation.memberId,
            memberName: operation.member.user?.name || "Unknown",
            memberEmail: operation.member.user?.email || "",
            operationType: operation.operationType,
            performedAt: operation.performedAt,
            performedBy: operation.performedBy,
            freezeDays: operation.freezeDays,
            price: operation.price,
            transactionFreeze: operation.transactionFreeze,
            subscriptions: [],
          });
        }

        // Add this subscription to the group
        groupedMap.get(groupKey)!.subscriptions.push({
          id: operation.subscription.id,
          packageName: operation.subscription.package.name,
          packageType: operation.subscription.package.type,
        });
      }

      // Convert map to array and sort by performedAt
      const grouped = Array.from(groupedMap.values()).sort(
        (a, b) => b.performedAt.getTime() - a.performedAt.getTime()
      );

      // Apply pagination
      const total = grouped.length;
      const startIndex = (input.page - 1) * input.limit;
      const endIndex = startIndex + input.limit;
      const items = grouped.slice(startIndex, endIndex);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Cancel freeze operation - reverse/undo freeze
  cancelFreeze: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        // Find member
        const member = await tx.membership.findUnique({
          where: { id: input.memberId },
          include: { user: true },
        });

        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        // Find all subscriptions with freeze data (either currently frozen OR have freeze history)
        const subscriptionsWithFreeze = await tx.subscription.findMany({
          where: {
            memberId: input.memberId,
            deletedAt: null,
            OR: [
              { isFrozen: true }, // Currently frozen
              { freezeAtStart: true }, // Was frozen at start
              { freezeDays: { gt: 0 } }, // Has freeze days
            ],
          },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        });

        if (subscriptionsWithFreeze.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No subscriptions with freeze data found for this member",
          });
        }

        const now = new Date();
        let cancelledCount = 0;
        const affectedSubscriptions: any[] = [];

        // Process each subscription
        for (const subscription of subscriptionsWithFreeze) {
          // Only process if it has freeze data
          const hasFreezeDays = subscription.freezeDays && subscription.freezeDays > 0;
          const hasFreezeAtStart = subscription.freezeAtStart === true;
          
          if (!hasFreezeDays && !hasFreezeAtStart) {
            continue; // Skip subscriptions without freeze data
          }

          // Calculate original end date by subtracting freeze days
          let originalEndDate = subscription.endDate;
          if (originalEndDate && subscription.freezeDays && subscription.freezeDays > 0) {
            originalEndDate = new Date(originalEndDate);
            originalEndDate.setDate(originalEndDate.getDate() - subscription.freezeDays);
          }

          // Update the subscription - reset all freeze fields
          const updatedSubscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              freezeAtStart: false,
              freezeDays: null,
              isFrozen: false,
              frozenAt: null,
              freezeMode: null,
              remainingDays: null,
              // Restore original end date (before freeze extension)
              ...(originalEndDate && { endDate: originalEndDate }),
            },
          });

          affectedSubscriptions.push({
            id: updatedSubscription.id,
            packageName: subscription.package.name,
            originalEndDate,
            previousEndDate: subscription.endDate,
          });

          cancelledCount++;
        }

        // Create a log entry for the cancellation (using FreezeOperation)
        // We'll create an UNFREEZE operation to track this cancellation
        const unfreezePrice = await tx.freezePrice.findFirst({
          where: {
            freezeDays: 0,
            price: 0,
          },
        });

        let freezePriceId = unfreezePrice?.id;
        if (!freezePriceId) {
          const createdUnfreezePrice = await tx.freezePrice.create({
            data: {
              freezeDays: 0,
              price: 0,
              isActive: true,
            },
          });
          freezePriceId = createdUnfreezePrice.id;
        }

        // Log cancellation for each affected subscription
        for (const sub of affectedSubscriptions) {
          await tx.freezeOperation.create({
            data: {
              subscriptionId: sub.id,
              memberId: input.memberId,
              operationType: "UNFREEZE",
              freezePriceId: freezePriceId,
              price: 0,
              transactionFreezeId: null,
              freezeDays: 0,
              performedById: ctx.session.user.id,
            },
          });
        }

          return {
            success: true,
            message: `Successfully cancelled freeze for ${cancelledCount} subscription(s)`,
            count: cancelledCount,
            memberId: input.memberId,
            memberName: member.user?.name || "Unknown",
            affectedSubscriptions,
          };
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "subscription.cancelFreeze",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),
});
